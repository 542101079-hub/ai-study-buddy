import { z, type ZodError } from "zod";

const nameMessages = {
  required: "请填写姓名",
  length: "姓名长度不能超过 120 个字符",
};

const emailMessages = {
  required: "请填写电子邮箱",
  invalid: "请输入有效的电子邮箱地址",
};

const passwordMessages = {
  required: "请填写密码",
  length: "密码至少需要 8 个字符",
};

const usernameMessages = {
  required: "请填写用户名",
  length: "用户名长度需要 3-24 位",
  format: "用户名只能包含字母、数字或下划线",
};

const tenantNameMessages = {
  required: "请填写租户名称",
  length: "租户名称不能超过 120 个字符",
};

const tenantLogoMessages = {
  required: "请填写租户 Logo 地址",
  invalid: "请输入有效的 Logo 图片链接",
};

const tenantTaglineMessages = {
  required: "请填写租户标语",
  length: "租户标语不能超过 160 个字符",
};

const tenantIdMessages = {
  required: "请选择要加入的租户",
  invalid: "租户标识无效",
};

const usernameSchema = z
  .string({ required_error: usernameMessages.required })
  .min(3, usernameMessages.length)
  .max(24, usernameMessages.length)
  .regex(/^[a-zA-Z0-9_]+$/, usernameMessages.format);

const passwordSchema = z
  .string({ required_error: passwordMessages.required })
  .min(8, passwordMessages.length)
  .max(72, "密码长度不能超过 72 个字符");

const tenantIdSchema = z
  .union([z.string().uuid(tenantIdMessages.invalid), z.literal("")])
  .optional()
  .transform((value) => {
    if (!value || value.length === 0) {
      return undefined;
    }
    return value;
  });

export const registerSchema = z.object({
  name: z
    .string({ required_error: nameMessages.required })
    .min(1, nameMessages.required)
    .max(120, nameMessages.length),
  email: z
    .string({ required_error: emailMessages.required })
    .trim()
    .toLowerCase()
    .min(1, emailMessages.required)
    .email(emailMessages.invalid),
  password: passwordSchema,
  username: usernameSchema.optional(),
  avatarUrl: z
    .union([z.string().url("请输入有效的头像链接"), z.literal("")])
    .optional()
    .transform((value) => {
      if (!value || value.length === 0) {
        return undefined;
      }
      return value;
    }),
  tenantId: tenantIdSchema,
});

export const adminRegisterSchema = registerSchema.extend({
  tenantId: z.undefined(),
  tenantName: z
    .string({ required_error: tenantNameMessages.required })
    .min(1, tenantNameMessages.required)
    .max(120, tenantNameMessages.length),
  tenantLogoUrl: z
    .string({ required_error: tenantLogoMessages.required })
    .trim()
    .url(tenantLogoMessages.invalid),
  tenantTagline: z
    .string({ required_error: tenantTaglineMessages.required })
    .min(1, tenantTaglineMessages.required)
    .max(160, tenantTaglineMessages.length),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: emailMessages.required })
    .trim()
    .toLowerCase()
    .min(1, emailMessages.required)
    .email(emailMessages.invalid),
  password: z
    .string({ required_error: passwordMessages.required })
    .min(1, passwordMessages.required),
  tenantId: z
    .string({ required_error: tenantIdMessages.required })
    .trim()
    .uuid(tenantIdMessages.invalid),
  remember: z.boolean().optional().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function formatValidationErrors(error: ZodError) {
  const formatted: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "root";
    formatted[path] = issue.message;
  }

  return formatted;
}

