const http = require('http');
const express = require('express');
const path = require('path');
const hbs = require('hbs');
const session = require ('express-session');
const exphbs = require('express-handlebars');
 
  const app = express();
  app.use (express.json());
  app.use(express.urlencoded({extended:false}));


const dbConnection = require('./connection/db');
const uploadFile = require('./middlewares/uploadFile');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const { send } = require('process');

  app.set('view engine','hbs');
  app.use('/public', express.static(path.join(__dirname, 'public')));
  

  app.use(session({
    cookie:{
      maxAge:1000 * 60 * 60 * 2,
    },
    store:new session.MemoryStore(),
    resave:false,
    secret:'secret',
    saveUninitialized:true,

  })
  );
  app.use(function(req,res,next){
    res.locals.message = req.session.message;
    delete req.session.message;
    next();
  })
  
  hbs.registerPartials(__dirname +'/views/partials');
  const pathFile ='http://localhost:3000/uploads/';

  hbs.registerHelper('select', function(selected, options){
    return options.fn(this).replace(
      new RegExp(' value=\"' + selected + '\"'), '$& selected="selected"'
    );
  });

  const isLogin = false;

  app.get('/', function (request, response) {
    const title = 'Bioskop';
    const query = `SELECT t1.*, t2.id as movieId, t2.name as movie, t3.id as userId, t3.name as user FROM ticket t1 join movie t2 on t1.movie_id=t2.id join user t3 on t1.user_id=t3.id ORDER BY id DESC`;
  
    dbConnection.getConnection(function (err, conn) {
      if (err) throw err;
      conn.query(query, function (err, results) {
        if (err) throw err;
  
        let ticket = [];
  
        for (var result of results) {
          ticket.push({
            id: result.id,
            ticket_number: result.ticket_number,
            date_show: result.date_show,
            time_show: result.time_show,
            price: result.price,
            venue : result.venue,
            photo: pathFile + result.photo,
            movie: result.movie,
            user: result.user,
            
          });
        }
  
        if (ticket.length == 0) {
          ticket= false;
        }
        response.render('index', {
          title,
          isLogin: request.session.isLogin,
          ticket,
        });
      });
    });
  });
  
  
 

// add ticket 

app.get('/add-ticket', function(request, response) {
  const title = 'Add ticket';
  const queryMovie = 'SELECT id as movieId, name as movie from movie';

  dbConnection.getConnection(function (err, connMovie) {
    if (err) throw err;
    connMovie.query(queryMovie, function (err, resultsM) {
      if (err) throw err;

      let movie = [];

      for (var result of resultsM) {
        movie.push({
          movieId: result.movieId,
          movie: result.movie,
        });
      }

      if (movie.length == 0) {
        movie = false;
      }

      const queryUser = `SELECT id as userId, name as user from user`;
      dbConnection.getConnection((err, connUser) => {
        if(err) throw err;
        connUser.query(queryUser, (err, resultsU) => {
          if(err) throw err;

          let user = [];

          for (const result of resultsU) {
            user.push({
              userId: result.userId,
              user: result.user,
            });
          }

          if (user.length == 0) {
            user = false;
          }

          response.render('add-ticket', {
            title,
            isLogin: request.session.isLogin,
            movie,
            user,
          });

        });
      });
    });
  });
});

// add ticket
app.post('/add-ticket', uploadFile('photo'), function(request, response){
  const {ticket_number, date_show,time_show, price, venue, movie_id, user_id} = request.body;

  var photo = '';

  if(request.file){
    photo = request.file.filename;
  }
  
  if(ticket_number == '' || date_show == '' || time_show == '' || price == '' || venue == '' || photo == '' || movie_id == '' || user_id == '') {
    request.session.message = {
      type: 'danger',
      message: 'Please input all the field!',
    };
    return response.redirect('/add-ticket');
  } 

  const query = `INSERT INTO ticket (ticket_number, date_show, time_show, price, venue,photo, movie_id, user_id) VALUES ("${ticket_number}", "${date_show}", "${time_show}", "${price}", "${venue}","${photo}", "${movie_id}", "${user_id}");`;

  dbConnection.getConnection(function(err, conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;

      request.session.message = {
        type: 'success',
        message: 'Add data success!',
      };
      response.redirect('/ticket');
    });
    conn.release();
  });
});



// edit ticket
app.get('/edit-ticket/:id', function (request, response) {
  const title = 'Edit Ticket';
  const { id } = request.params;

  const query = `SELECT * FROM ticket WHERE id = ${id}`;

  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      const ticket = {
        ...results[0],
        photo: pathFile + results[0].photo,
      };

      const queryMovie = `SELECT name as movie, id as movieId FROM movie`;
      dbConnection.getConnection(function(err, connMovie){
        if(err) throw err;

        connMovie.query(queryMovie, function(err, resultsM){
          if (err) throw err;

          let movie = [];

          for (var result of resultsM) {
            movie.push({
              movieId: result.movieId,
              movie: result.movie,
            });
          }

          if (movie.length == 0) {
            movie = false;
          }
 
          const queryUser = `SELECT name as user, id as userId from user`;
          dbConnection.getConnection((err, connUser) => {
            if(err) throw err;

            connUser.query(queryUser, (err, resultsU) => {
              if (err) throw err;

              let user = [];

              for (const result of resultsU) {
                user.push({
                  userId: result.userId,
                  user: result.user,
                });
              }

              if (user.length == 0) {
                user = false;
              }

              response.render('edit-ticket', {
                title,
                isLogin: request.session.isLogin,
                ticket,
                movie,
                user,
              });

            });
          });
        });
      });
    });
    conn.release();
  });
});

app.post('/edit-ticket', uploadFile('photo'), function (request, response) {
  var { id, ticket_number, date_show, time_show, price,venue, oldPhoto, movie_id,user_id } = request.body;
 
  var photo = oldPhoto.replace(pathFile, '');

  if (request.file) {
    photo = request.file.filename;
  }
  const query = `UPDATE ticket SET ticket_number= "${ticket_number}", date_show = "${date_show}", time_show = "${time_show}", price = "${price}", venue = "${venue}",  photo = "${photo}", movie_id = "${movie_id}", user_id = "${user_id}" WHERE id = ${id}`;
  console.log(query);
  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      response.redirect(`/ticket`);
    });
    conn.release();
  });
});


// delete Ticket

app.get('/delete-ticket/:id', function(request,response){
  const { id } = request.params;
  const query = `DELETE FROM ticket WHERE id = ${id}`;

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;
      response.redirect('/ticket');
    });
    conn.release();
  });
});

app.get('/ticket', function(request,response){
  const title = 'ticket';
  const query = 'SELECT * FROM ticket';

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, results){
      if(err) throw err;

      let ticket = [];
      for(var result of results){
        ticket.push({
          id: result.id,
          ticket_number: result.ticket_number,
          date_show: result.date_show,
          time_show: result.time_show,
          price: result.price,
          venue :result.venue,
          photo:pathFile + result.photo,
          movie_id: result.movie_id,
          user_id: result.user_id,
        });
      }

      if(ticket.length == 0) {
        ticket = false
      }

      response.render('ticket', {
        title,
        isLogin: request.session.isLogin,
        ticket,
      });
    });
    conn.release();
  });
});


// movie

app.get('/movie', function(request,response){
  const title = 'Bioskop';
 
  const query = 'SELECT t1.*, t2.name as type FROM movie t1 join type t2 on t1.type_id=t2.id';

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, results){
      if(err) throw err;

      let movie = [];
      for(var result of results){
        movie.push({
          id: result.id,
          name: result.name,
          movie_hour: result.movie_hour,
          type_id: result.type_id,
          type: result.type,
        });
      }

      if(movie.length == 0) {
        movie = false
      }

      response.render('movie', {
        title,
        isLogin: request.session.isLogin,
        movie,
      });
    });
    conn.release();
  });
});





//delete movie

app.get('/delete-movie/:id', function(request,response){
  const { id } = request.params;
  const query = `DELETE FROM movie WHERE id = ${id}`;

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;
      response.redirect('/movie');
    });
    conn.release();
  });
});


app.get('/add-movie', function(request, response) {
  const title = 'Add movie';
  const query = 'SELECT id, name from type';

  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      let type = [];

      for (var result of results) {
       type.push({
          id: result.id,
          name: result.name,
          movie_hour:result.movie_hour,
          type_id : result.type_id,
        });
      }

      if (type.length == 0) {
        type = false;
      }
      
      response.render('add-movie', {
        title,
        type,
        isLogin: request.session.isLogin,
      });
    });
  });
});


// add movie
app.post('/add-movie', function(request, response){
  const {name, movie_hour, type_id} = request.body;
 
  if(name == '' ||movie_hour == '' || type_id == '' ) {
    request.session.message = {
      type: 'danger',
      message: 'Please input all the field!',
    };
    return response.redirect('/add-movie');
  } 

  const query = `INSERT INTO movie (name, movie_hour,type_id) VALUES ("${name}", "${movie_hour}", "${type_id}");`;

  dbConnection.getConnection(function(err, conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;

      request.session.message = {
        type: 'success',
        message: 'Add data success!',
      };
      response.redirect('/movie');
    });
    conn.release();
  });
});


//edit movie

app.get('/edit-movie/:id', function (request, response) {
  const title = 'Edit movie';
  const { id } = request.params;

  const query = `SELECT * FROM movie WHERE id = ${id}`;

  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      const movie = {
        ...results[0],
      };
      
      const queryType = `SELECT id as typeId, name as type from type`;
      dbConnection.getConnection((err, connType) => {
        if(err) throw err;

        connType.query(queryType, (err, resultT)=> {
          if(err) throw err;

          let type = [];
          
          for (const result of resultT) {
            type.push({
              typeId: result.typeId,
              type: result.type,
            });
          }

          if (type.length == 0) {
               type = false;  
          }
          
          response.render('edit-movie', {
            title,
            isLogin: request.session.isLogin,
            movie,
            type,
          });

        });
      });
    });
    conn.release();
  });
});

app.post('/edit-movie', function (request, response) {
  var{ id,name,movie_hour,type_id } = request.body;

  const query = `UPDATE movie SET name = "${name}", movie_hour = "${movie_hour}",type_id = "${type_id}" WHERE id = ${id}`;

  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      response.redirect(`/movie`);
    });
    conn.release();
  });
});


// type
app.get('/type', function(request,response){
  const title = 'Type';
  
  const query = 'SELECT * FROM type';

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, results){
      if(err) throw err;

      let types = [];
      for(var result of results){
        types.push({
          id: result.id,
          name: result.name,
        });
      }

      if(types.length == 0) {
        types = false
      }

      response.render('type', {
        title,
        isLogin: request.session.isLogin,
        types,
      });
    conn.release();
    });
  });
});

app.get('/add-type', function (request, response) {
  const title = 'Add type';
  response.render('add-type', {
    title,
        isLogin: request.session.isLogin,
  });
});

app.post('/add-type', function(request, response){
  const {name} = request.body;

  if(name == '') {
    request.session.message = {
      type: 'danger',
      message: 'Please input all the field!',
    };
    return response.redirect('/add-type');
  } 

  const query = `INSERT INTO type (name) VALUES ("${name}");`;

  dbConnection.getConnection(function(err, conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;

      request.session.message = {
        type: 'success',
        message: 'Input data success!',
      };
      response.redirect('/type');
    });
    conn.release();
  });
});

app.get('/edit-type/:id', function (request, response) {
  const title = 'Edit type';
  const { id } = request.params;

  const query = `SELECT * FROM type WHERE id = ${id}`;

  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      const type = {
        ...results[0],
      };

      response.render('edit-type', {
        title,
        isLogin: request.session.isLogin,
        type,
      });
    });
    conn.release();
  });
});

app.post('/edit-type', function(request, response){
  var { id, name} = request.body;

  const query = `UPDATE type SET name = "${name}" WHERE id = ${id}`;

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;
      response.redirect('/type');
    });
    conn.release();
  });
});

app.get('/delete-type/:id', function(request, response){
  const { id } = request.params;
  const query = `DELETE FROM type WHERE id = ${id}`;

  dbConnection.getConnection(function(err,conn){
    if(err) throw err;
    conn.query(query, function(err, result){
      if(err) throw err;
      response.redirect('/type');
    });
    conn.release();
  });
});


app.get('/register',function(req,res) {
  const title ='Register';
  res.render('register', {
  title,
  isLogin,
 });
 });

app.post('/register',function(req,res) {
const{name,email,password} = req.body;

  if(name == ''|| email == '' || password == ''){
    req.session.message = {
      type:'danger',
      message:'please insert all',
    };
    return res.redirect('/register');
  }
  

const query =` INSERT INTO user (name,email,password) VALUES ("${name}","${email}","${password}");`;
dbConnection.getConnection(function(err,conn){
  if(err) throw err;
  conn.query (query,function(err,results) {
    if(err) throw err;
    
    req.session.message= {
      type:'success',
      message:'register success',
    };

    res.redirect('/register');
  });
  });
 });
 


 //index user
app.get('/list-ticket', function (request, response) {
  const title = 'Bioskop';
  const query = `SELECT t1.*, t2.id as movieId, t2.name as movie, t3.id as userId, t3.name as user FROM ticket t1 join movie t2 on t1.movie_id=t2.id join user t3 on t1.user_id=t3.id ORDER BY id DESC`;
  
  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      let ticket = [];

      for (var result of results) {
        ticket.push({
          id: result.id,
          ticket_number: result.ticket_number,
          date_show: result.date_show,
          time_show: result.time_show,
          price: result.price,
          venue : result.venue,
          photo: pathFile + result.photo,
          movie: result.movie,
          user: result.user,
        });
      }

      if (ticket.length == 0) {
        ticket= false;
      }
      response.render('list-ticket', {
        title,
        isLogin: request.session.isLogin,
        ticket,
      });
    });
  });
});



app.get('/login', function (request, response) {
  const title = 'Login';
  response.render('login', {
    title,
    isLogin: request.session.isLogin,
  });
});
  

app.post('/login', function (request, response) {
  const { email, password } = request.body;

  if (email == '' || password == '') {
    request.session.message = {
      type: 'danger',
      message: 'Please insert all field!',
    };
    return response.redirect('/login');
  } 

  const query = `SELECT *, MD5(password) as password FROM user WHERE email = "${email}" AND password = "${password}"`;

  dbConnection.getConnection(function (err, conn) {
    if (err) throw err;
    conn.query(query, function (err, results) {
      if (err) throw err;

      if (results.length == 0) {
        request.session.message = {
          type: 'danger',
          message: 'Email and password dont match!',
        };
        response.redirect('/login');
      } else {
        request.session.message = {
          type: 'success',
          message: 'Login has successfully!',
        };

        request.session.isLogin = true;

        request.session.user = {
          id: results.id,
          email: results.email,
          name: results.name,
         
        };
        response.redirect('/');
      }
    });
    conn.release();
  });
});


 app.get('/logout',function(req,res) {
  req.session.destroy();
  res.redirect('/');
 });



  const port = 3000;
  const server = http.createServer(app);
  server.listen(port);
  console.debug(`Tersambung.... ${port}`);
  