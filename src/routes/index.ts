import  express from "express";
import  tagRouter from './tags/tags';

    let router = express.Router();

    router.use('/tags', tagRouter);

  // Export the router
  export default
   router;