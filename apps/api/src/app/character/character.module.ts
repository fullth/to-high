import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CharacterDocument,
  CharacterSchema,
} from '../../database/character.schema';
import { CharacterRepository } from '../../persistence/character/character.repository';
import { CharacterService } from './character.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CharacterDocument.name, schema: CharacterSchema },
    ]),
  ],
  providers: [CharacterRepository, CharacterService],
  exports: [CharacterService],
})
export class CharacterModule {}
