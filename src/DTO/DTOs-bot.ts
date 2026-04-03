export interface MemberJoinedDto {
  event: string;
  invite_code: string;
  user_id: string;
  username: string;
  joined_at: Date;
  role_id: string;
}

export interface ResponseDto {
  statusCode: number;
  message: string;
}

