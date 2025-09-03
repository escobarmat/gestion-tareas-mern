var createError = require('http-errors');
var express = require('express');
require('dotenv').config();
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const { dbConnection } = require('./databases/config');
const cors = require('cors');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/authRoute');
var app = express();

app.use(cors({
  origin: 'http://localhost:5173', // o el puerto donde corre Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-token'],
  credentials: true
}));


// view engine setup
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Rutas
// app.use('/', indexRouter);
// app.use('/users', usersRouter);
app.use('/api/auth', require('./routes/authRoute'));
app.use('/api/project', require('./routes/projectRoute'));
app.use('/api/task', require('./routes/taskRoute'));

//Base de datos 
dbConnection();

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
