import nodemailer from "nodemailer"

const smtpHost = process.env.SMTP_HOST
const smtpPortRaw = process.env.SMTP_PORT
const smtpUser = process.env.SMTP_USER
const smtpPassword = process.env.SMTP_PASSWORD
const smtpSecureRaw = process.env.SMTP_SECURE
const fallbackFrom = process.env.SMTP_FROM
const configuredFrom = process.env.NOTIFICATION_EMAIL_FROM ?? fallbackFrom ?? smtpUser ?? ""

const smtpPort = smtpPortRaw ? Number.parseInt(smtpPortRaw, 10) : undefined
const smtpSecure = typeof smtpSecureRaw === "string" ? smtpSecureRaw.toLowerCase() === "true" : false

let transporter: nodemailer.Transporter | null = null

const hasAuth = Boolean(smtpUser && smtpPassword)

export const isEmailConfigured = () =>
  Boolean(smtpHost && Number.isFinite(smtpPort) && smtpPort && configuredFrom)

const ensureTransporter = () => {
  if (!isEmailConfigured()) {
    throw new Error("邮件服务未正确配置，请检查 SMTP 环境变量")
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: hasAuth
        ? {
            user: smtpUser!,
            pass: smtpPassword!,
          }
        : undefined,
    })
  }

  return transporter
}

type SendEmailParams = {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
}

export const sendEmail = async ({ to, subject, text, html, attachments }: SendEmailParams) => {
  const transport = ensureTransporter()

  await transport.sendMail({
    from: configuredFrom,
    to,
    subject,
    text,
    html,
    attachments,
  })
}
