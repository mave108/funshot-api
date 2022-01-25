import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import redisClient from '../../db/redis';
import { PostProps } from './types';
import HTTPResponse, { HTTPStatus, HTTPMessage } from '../../utils/http-response';

let router = Router();


router.get('/', async (req: Request, res: Response, next:NextFunction) => {
    const pageLength = 10;
    const {offset = 0} = req.body;
    try {
       //get post ids from list
       const postListResp = await redisClient.lRange('POSTS',offset,pageLength);
       let posts: any[] = [];
       if (postListResp.length > 0) {
        await Promise.all( 
            postListResp.map( async(pid) => {
            //get post
            const post = await redisClient.hGetAll(`POST::${pid}`);
            //get tags
            const tags = await redisClient.sMembers(post.tag_identifier);                        
            posts.push({...post, tags: [...tags]});
        })); 
        return new HTTPResponse(res)
                .setStatus(HTTPStatus.OK)
                .setData('posts',posts)
                .send();       
       }     
       return new HTTPResponse(res)
                .setStatus(HTTPStatus.NOT_FOUND)
                .setMsg(HTTPMessage.NOT_FOUND)                
                .send();  
       
   } catch (e) {
       return next(e);
   }
});

router.post('/', async (req: Request, res: Response, next:NextFunction) => {
    
    try {                                                                 
            //save post data to hash
            const hashId = uuidv4();
            const {title = '',description = '', uid = 1, tags = [], video_id = ''} = req.body as PostProps;                        
            const postObj = {
                'title': title,
                'description': description,
                'tag_identifier': `POST::${hashId}::TAGS`,
                'video_id': video_id,
                'uid': uid,
                'view': 1,
                'date': new Date().getTime()
            }                
            const hashResp = await redisClient.hSet(`POST::${hashId}`, postObj);  
            //save tags to set
            const tagResp = await redisClient.sAdd(`POST::${hashId}::TAGS`, tags);   
            //save post it to user set
            const userResp = await redisClient.sAdd(`USER::${uid}::POSTS`, hashId); 
            // insert post id to post list
            const listResp = await redisClient.lPush('POSTS', hashId);                     
            //send success
            return new HTTPResponse (res)
                .setStatus(HTTPStatus.OK)
                .setMsg(HTTPMessage.CREATED)
                .setData('post', {...postObj,recordCreated: (tagResp+hashResp+listResp+userResp)})
                .send();                                  
          } catch (e) {
            new HTTPResponse(res)
            .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
            .setMsg(HTTPMessage.SOMETHING_WENT_WRONG)
            .send();  
          }                   
            
});

router.delete('/', async (req: Request, res: Response, next:NextFunction) => {

});

export default router;