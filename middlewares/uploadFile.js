const multer = require('multer');

module.exports =(imageFile)=> {
    const storage =multer.diskStorage({
        destination:function(req,file,cb){
        cb(null,'uploads');
        },
        filename:function(req,file,cb){
         cb(null,Date.now() + '-' + file.originalname.replace(/\s/g,''));
        }
    
    });

    const fileFilter = function(req,file,cb) {
        if(file.filename === imageFile) {
            if(!file.originalname.match(/\.(jpg|JPEG|jpeg|JPEG|png|PNG)$/)){
                req.fileValidationError = {
                    message:'only image files allowed'
                };
                return cb(new Error('only image files are allowed!'),false);
            }
        }
        cb(null,true);
    };
    const SizeInMb = 10;
    const maxSize= SizeInMb * 1000 *1000;
    const upload = multer({
        storage,
        fileFilter,
        limits:{
            fileSize :maxSize,

        },
    }).single(imageFile);


    return function(req,res,next){
        upload(req,res,function(err){
            if(req.fileValidationError){
                req.session.message ={
                    type:'danger',
                    message:'please select file to upload',

                };
                return res.redirect(req.originalUrl);
            }
            
       
        if(err) {
        if(err.code == 'LIMIT FILE SIZE'){
            req.session.message ={
                type:'danger',
                message:'error max size 10 MB',
            };
            return res. redirect(req.originalUrl);
        }
        req.session.message={
            type:'danger',
            message: err,
        }
        return res.redirect(req.originalUrl);
      }
      return next();
    });
    }
}