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
            let postTagArr;            
            if (tags) {                
                const postTags = await redisClient.hmGet('TAGS', tags);
                postTagArr = postTags.map((tagName, index) => ({name: tagName,id: tags[index]}));                
            }                      
            posts.push({...post, tags: postTagArr});
        })); 
        return new HTTPResponse(res)
                .setStatus(HTTPStatus.OK)
                .setData('posts',posts)
                .send();       
       }     
       return new HTTPResponse(res)
                .setStatus(HTTPStatus.BAD_REQUEST)
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
            const {
                title = '',
                description = '', 
                uid = 1, 
                tags = [],
                media_id = '', 
                s3_url = ''
                } = req.body as PostProps;      
                console.log("body", req.body);                  
            const postObj = {
                'id': hashId,
                'title': title,
                'description': description,
                'tag_identifier': `POST::${hashId}::TAGS`,
                'media_id': media_id,
                's3_url': s3_url,
                'uid': uid,
                'view': 1,
                'timestamp': new Date().getTime()
            }                
            let tagResp: number = 0;
            const hashResp = await redisClient.hSet(`POST::${hashId}`, postObj);              
            //save tags to set
            if (tags.length > 0) {                
                tagResp = await redisClient.sAdd(`POST::${hashId}::TAGS`, tags);   
            }            
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
              console.log("post creation error", e);
            new HTTPResponse(res)
            .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
            .setMsg(HTTPMessage.SOMETHING_WENT_WRONG)
            .send();  
          }                   
            
});

router.delete('/', async (req: Request, res: Response, next:NextFunction) => {
  try {
      const {post_ids} = req.body;
      if (post_ids.length > 0) {
            let tagResp, userRest, listResp, hashresp;
            await Promise.all([...post_ids].map( async (pid) => {
                tagResp  = await redisClient.del(`POST::${pid}::TAGS`);
                userRest = await redisClient.del(`USER::${pid}::POSTS`);
                listResp = await redisClient.lRem(`POSTS`, 1, pid);
                hashresp = await redisClient.del(`POST::${pid}`);
            }));
            return new HTTPResponse(res)
                .setStatus(HTTPStatus.CREATED)
                .setMsg(HTTPMessage.DELETED)
                .setData('recordCount',(tagResp || 0) + (userRest || 0) + (listResp || 0) +(hashresp || 0))
                .send();
        }
        return new HTTPResponse(res)
            .setStatus(HTTPStatus.BAD_REQUEST)
            .setMsg(HTTPMessage.NOT_FOUND)
            .send();
      
  } catch (e) {
    new HTTPResponse(res)
        .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
        .setMsg(HTTPMessage.SOMETHING_WENT_WRONG)
        .send(); 
  }
});

router.put('/:post_id', async (req: Request, res: Response, next:NextFunction) => {
      
    try {
      const {...post} = req.body;      
      const {post_id} = req.params;
      //get post
      const postdata = await redisClient.hGetAll(`POST::${post_id}`);
      if (post) {         
      await redisClient.hSet(`POST::${post_id}`, {...postdata, ...post});      
          return  new HTTPResponse(res)
          .setStatus(HTTPStatus.OK)
          .setMsg(HTTPMessage.UPDATED)                       
          .send();      
      }    
      return new HTTPResponse(res)
                .setStatus(HTTPStatus.BAD_REQUEST)                
                .setMsg(HTTPMessage.NOT_FOUND)                
                .send();  
    } catch (e) {
        return new HTTPResponse(res)
                .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                .setMsg(HTTPMessage.SOMETHING_WENT_WRONG)  
                .setData('body', req.body)              
                .send();
    }    
});

export default router;