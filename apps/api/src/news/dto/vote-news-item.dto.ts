import { IsIn, IsOptional } from 'class-validator';

export class VoteNewsItemDto {
  @IsOptional()
  @IsIn(['up', 'down'])
  voteType?: 'up' | 'down';
}
