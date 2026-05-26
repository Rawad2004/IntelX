import { IsEmail } from "class-validator";

export class ResendConfirmDto {
  @IsEmail()
  email!: string;
}
