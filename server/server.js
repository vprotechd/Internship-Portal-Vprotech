import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';

import authRoutes from './routes/auth.js';
import examRoutes from './routes/exam.js';
import adminRoutes from './routes/admin.js';

import { User, Domain, Submission, Test } from './models/index.js';
import { gradeMcq } from './utils/grade.js';

const app = express();

/*
|--------------------------------------------------------------------------
| Trust Proxy
|--------------------------------------------------------------------------
| Required when running behind Render's proxy.
|--------------------------------------------------------------------------
*/

app.set('trust proxy', 1);

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
| Supports both local development and the deployed frontend.
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://internship-portal-vprotech.onrender.com',
  process.env.CLIENT_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as Postman/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log('Blocked CORS origin:', origin);

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '200kb',
  })
);

app.use(cookieParser());

app.use(helmet());

/*
|--------------------------------------------------------------------------
| Rate Limiting
|--------------------------------------------------------------------------
*/

app.use(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
      success: false,
      message: 'Too many login attempts, try again later',
    },
  })
);

/*
|--------------------------------------------------------------------------
| API Health / Test Routes
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'VProTech Internship Portal API is running',
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'VProTech Internship Portal API is running',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'API is healthy',
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use('/api/auth', authRoutes);

app.use('/api/exam', examRoutes);

app.use('/api/admin', adminRoutes);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Not found',
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);

  const code =
    err.name === 'ValidationError' ||
    err.name === 'CastError'
      ? 400
      : err.code === 11000
      ? 409
      : err.message?.startsWith('CORS blocked')
      ? 403
      : 500;

  res.status(code).json({
    success: false,
    message:
      code === 500
        ? 'Server error'
        : err.message,
  });
});

/*
|--------------------------------------------------------------------------
| Automatically Expire Exam Attempts
|--------------------------------------------------------------------------
*/

const expireAttempts = async () => {
  try {
    const now = new Date();

    const expired = await Submission.find({
      status: 'in-progress',
      deadline: {
        $lte: now,
      },
    })
      .select('_id testId answers')
      .limit(500)
      .lean();

    if (!expired.length) {
      return;
    }

    const tests = await Test.find({
      _id: {
        $in: expired.map((submission) => submission.testId),
      },
    })
      .populate('questions')
      .lean();

    const byId = new Map(
      tests.map((test) => [
        String(test._id),
        test,
      ])
    );

    await Promise.all(
      expired.map(async (submission) => {
        const test = byId.get(
          String(submission.testId)
        );

        const answers =
          submission.answers instanceof Map
            ? Object.fromEntries(submission.answers)
            : submission.answers || {};

        const score = test
          ? gradeMcq(test.questions, answers)
          : 0;

        await Submission.updateOne(
          {
            _id: submission._id,
            status: 'in-progress',
            deadline: {
              $lte: now,
            },
          },
          {
            $set: {
              score,
              status: 'auto-submitted',
              submittedAt: now,
            },
          }
        );
      })
    );

    console.log(
      `Auto-submitted ${expired.length} expired assessment(s).`
    );
  } catch (error) {
    console.error(
      'Expiry worker error:',
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| MongoDB + Server Startup
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        'MONGO_URI is not configured'
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log('Connected to MongoDB');

    /*
    |--------------------------------------------------------------------------
    | Convert old candidate role to student
    |--------------------------------------------------------------------------
    */

    await User.updateMany(
      {
        role: 'candidate',
      },
      {
        $set: {
          role: 'student',
        },
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Default Assessment Domains
    |--------------------------------------------------------------------------
    */

    const defaultDomains = [
      'MERN Stack',
      '.NET',
      'Java',
      'Python',
      'Frontend Development',
      'Full Stack Development',
    ];

    for (const name of defaultDomains) {
      await Domain.updateOne(
        {
          name,
        },
        {
          $setOnInsert: {
            name,
            description: `${name} assessment domain`,
            isActive: true,
          },
        },
        {
          upsert: true,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Create Admin Automatically If Needed
    |--------------------------------------------------------------------------
    */

    const {
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    } = process.env;

    if (
      ADMIN_EMAIL &&
      ADMIN_PASSWORD &&
      !(await User.exists({ role: 'admin' }))
    ) {
      await User.create({
        name: 'VproTech Admin',

        email:
          ADMIN_EMAIL.toLowerCase(),

        phone: '0000000000',

        role: 'admin',

        passwordHash:
          await bcrypt.hash(
            ADMIN_PASSWORD,
            12
          ),
      });

      console.log(
        'Default admin account created.'
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Expiry Worker
    |--------------------------------------------------------------------------
    */

    const interval = setInterval(() => {
      expireAttempts();
    }, 5000);

    /*
    |--------------------------------------------------------------------------
    | Graceful Shutdown
    |--------------------------------------------------------------------------
    */

    const shutdown = async () => {
      console.log(
        'Shutting down server...'
      );

      clearInterval(interval);

      await mongoose.disconnect();

      process.exit(0);
    };

    process.on(
      'SIGINT',
      shutdown
    );

    process.on(
      'SIGTERM',
      shutdown
    );

    /*
    |--------------------------------------------------------------------------
    | Start HTTP Server
    |--------------------------------------------------------------------------
    */

    const PORT =
      process.env.PORT || 5000;

    app.listen(
      PORT,
      '0.0.0.0',
      () => {
        console.log(
          `API running on port ${PORT}`
        );

        console.log(
          `Allowed frontend origins:`,
          allowedOrigins
        );
      }
    );
  } catch (error) {
    console.error(
      'Failed to start server:',
      error
    );

    process.exit(1);
  }
};

startServer();