import { PartialType } from '@nestjs/mapped-types';
import { CreateMarketTokenDto } from './create-market-token.dto';

export class UpdateMarketTokenDto extends PartialType(CreateMarketTokenDto) {}
