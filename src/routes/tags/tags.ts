import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../../db/redis';
import HTTPResponse, { HTTPStatus, HTTPMessage } from '../../utils/http-response';
import {TagProps} from './types'

let router = Router();

router.get('/', async (req: Request, res: Response, next:NextFunction) => {
    try {
        const tags:TagProps = await redisClient.hGetAll('tags'); 
        const tagObject = {...tags};
        const tagArr = []; 
        for(var propName in tagObject) {            
            if(tagObject.hasOwnProperty(propName)) {                
                tagArr.push({name: propName,id:  tags[propName]});                
            }
        }      
        return new HTTPResponse(res)
          .setStatus(HTTPStatus.OK)  
          .setData('tags',tagArr)
          .send();
    } catch (e) {
        return next(e);
    }
    
    // await redisClient.quit();    
});

router.post('/', async (req: Request, res: Response,next:NextFunction) => {
    const  tagsToAdd: string[]  = req.body; 
    const tagHashes = tagsToAdd.reduce((acc,curr)=> ({...acc,[curr]:uuidv4()}), {});
    const tagsCreated: string[] = Object.values(tagHashes);
    try {
        const redisRes = await redisClient.hSet('tags', tagHashes);                
        return new HTTPResponse(res)
                   .setStatus(HTTPStatus.OK)
                   .setMsg(HTTPMessage.CREATED)
                   .setData('tags',tagsCreated)
                   .send();
    } catch (e) {      
        return next(e);
    }     
});

router.delete('/',async(req: Request, res: Response, next: NextFunction) => {
    try {
        const  tagsToDel: string[]  = req.body; 
        const redisRes = await redisClient.hDel('tags', tagsToDel);
        return new HTTPResponse(res)
                   .setStatus(HTTPStatus.OK)
                   .setSuccess(!!redisRes)
                   .setMsg(redisRes?HTTPMessage.DELETED: HTTPMessage.NOT_FOUND)   
                   .setData('deleteCount',redisRes)                
                   .send();
    } catch (e) {      
        return next(e);
    } 
})

export default router;