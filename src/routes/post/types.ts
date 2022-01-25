

export interface PostProps {
    title: string;
    description: string;
    uid: number
    tags: string[];
    video_id: string;
    s3_url: string;
    date?: number
}