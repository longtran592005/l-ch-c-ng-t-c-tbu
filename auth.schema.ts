import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string({ required_error: "Email là bắt buộc" })
            .email("Email không hợp lệ"),
    password: z.string({ required_error: "Mật khẩu là bắt buộc" })
             .min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];