import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/core/auth/policy";

type Operation = "login" | "register" | "change-password" | "enroll" | "verify" | "sign-out";
export type AuthFailure = {
  message: string;
  field?: "credentials" | "name" | "password" | "confirmation" | "currentPassword" | "newPassword" | "code";
  recovery?: "login" | "refresh";
};

const fallback: Record<Operation, string> = {
  login: "暂时无法登录，请稍后重试。",
  register: "暂时无法创建账户，请检查信息后重试。",
  "change-password": "暂时无法修改密码，请稍后重试。",
  enroll: "暂时无法开始设置，请稍后重试。",
  verify: "暂时无法完成验证，请稍后重试。",
  "sign-out": "退出失败，请重试。",
};

/** Display only allowlisted messages. HTTP failures never imply a bad field value. */
export function authFailure(error: { code?: string; status?: number }, operation: Operation): AuthFailure {
  if (error.status === 0) return { message: "网络暂时不可用，请稍后重试。" };
  if (error.status !== undefined && error.status >= 500) return { message: "服务暂时不可用，请稍后重试。" };
  if (error.code === "ACCOUNT_TEMPORARILY_LOCKED") {
    return { message: "验证失败次数过多，此账户已暂时锁定。请稍后再试。" };
  }
  if (error.status === 429) return { message: "操作过于频繁，请稍后重试。" };
  if (operation === "login" && error.code === "INVALID_EMAIL_OR_PASSWORD") {
    return { message: "邮箱或密码不正确，请重新检查。", field: "credentials" };
  }
  if (["enroll", "verify", "change-password"].includes(operation)
    && ["INVALID_TWO_FACTOR_COOKIE", "SESSION_EXPIRED", "UNAUTHORIZED", "MFA_REAUTH_REQUIRED", "MFA_REQUIRED", "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE"].includes(error.code ?? "")) {
    return { message: "当前验证已失效，请重新登录后继续。", recovery: "login" };
  }
  if (operation === "enroll" && error.code === "TWO_FACTOR_ALREADY_ENABLED") {
    return { message: "身份验证器已经启用，请刷新账户状态。", recovery: "refresh" };
  }
  if (operation === "verify" && error.code === "TOTP_NOT_ENABLED") {
    return { message: "身份验证器尚未就绪，请重新登录后继续设置。", recovery: "login" };
  }
  if (operation === "verify" && error.code === "INVALID_CODE") {
    return { message: "代码无效或已经使用，请检查身份验证器中的当前代码。", field: "code" };
  }
  if (["enroll", "change-password"].includes(operation) && error.code === "INVALID_PASSWORD") {
    return { message: "当前密码不正确。", field: operation === "enroll" ? "password" : "currentPassword" };
  }
  if (["register", "change-password"].includes(operation) && ["PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG"].includes(error.code ?? "")) {
    return {
      message: `密码长度须为 ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} 位字符。`,
      field: operation === "register" ? "password" : "newPassword",
    };
  }
  return { message: fallback[operation] };
}
