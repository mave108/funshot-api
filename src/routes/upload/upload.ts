import {Router, Request, Response, NextFunction} from "express";
import { v4 as uuidv4 } from 'uuid';
import path from 'node:path';
import { FileUploadProps } from './types';
import HTTPResponse, { HTTPStatus, HTTPMessage } from '../../utils/http-response';

let router = Router();

router.post('/', async (req: Request, res: Response, next:NextFunction) => {        
    try {
        if (!req.files || Object.keys(req.files).length === 0) {        
            new HTTPResponse(res)
                .setStatus(HTTPStatus.BAD_REQUEST)
                .setMsg('No files were uploaded.')
                .send();
            }
        let fileToUpload: FileUploadProps;
        let fileExt;
        let rootDir = path.resolve('./');
        if (req.files && req.files.hasOwnProperty('video')) {  
            fileToUpload = req.files.video as FileUploadProps;  
            fileExt = path.extname(fileToUpload.name);  
            if (fileToUpload.mimetype != 'video/mp4') {        
                return new HTTPResponse(res)
                    .setStatus(HTTPStatus.BAD_REQUEST)
                    .setMsg('bad media file')
                    .send();
            }  
            //upload file
            let videoId = uuidv4();
            let fileDestination = `${rootDir}/temp/${videoId}.${fileExt}`;
            fileToUpload.mv(fileDestination, async (e) => {
                if(e) {                        
                    return new HTTPResponse(res)
                        .setStatus(HTTPStatus.INTERNAL_SERVER_ERROR)
                        .setMsg('Something went wrong while file uploading.')
                        .setData('error', e)
                        .send();
                }   
                return new HTTPResponse (res)
                    .setStatus(HTTPStatus.OK)
                    .setMsg(HTTPMessage.CREATED)
                    .setData('video', videoId)
                    .send(); 
                });
        }
    } catch (e) {
        new HTTPResponse(res)
            .setStatus(HTTPStatus.BAD_REQUEST)
            .setMsg('Bad request')
            .send();
    }  
    
});


export default router;