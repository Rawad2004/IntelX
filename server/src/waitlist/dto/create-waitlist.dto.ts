import { IsEmail, MaxLength } from "class-validator";

export class CreateWaitlistDto {
  @IsEmail()
  @MaxLength(190)
  email!: string;
}
