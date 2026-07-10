package com.jry.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;

/**
 * Sends emails via Spring's JavaMailSender (configured for Gmail SMTP in
 * application.properties). Right now we only send the verification email; future
 * mails (password reset, notifications) would add methods here.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    @Value("${app.mail.from-name:TaskApp}")
    private String fromName;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends an HTML verification email. The link points to {@code /verify?token=...}
     * on whatever base URL the app is running at.
     *
     * @param toEmail recipient address
     * @param displayName user's display name, used in the greeting
     * @param verificationUrl the full verification URL the user should click
     * @throws MessagingException if Gmail rejects the message (bad credentials, etc.)
     */
    public void sendVerificationEmail(String toEmail, String displayName, String verificationUrl)
            throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        // 'true' = multipart so we can have an HTML body
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());

        try {
            helper.setFrom(new InternetAddress(fromAddress, fromName));
        } catch (UnsupportedEncodingException e) {
            // UTF-8 is always supported in practice; rethrow as runtime so it isn't silently swallowed.
            throw new IllegalStateException("UTF-8 encoding unavailable", e);
        }
        helper.setTo(toEmail);
        helper.setSubject("Verify your TaskApp account");
        helper.setText(buildHtmlBody(displayName, verificationUrl), true); // true = HTML

        log.info("Sending verification email to {}", toEmail);
        mailSender.send(message);
    }

    /**
     * Builds the HTML body. Kept deliberately simple: inline styles (most mail clients
     * strip <style> blocks), table-free layout, neutral colors. No external resources
     * (no <img> tags pointing at our app — those get blocked by most mail clients until
     * the user explicitly loads them, and we don't have a hosted logo asset anyway).
     */
    private String buildHtmlBody(String displayName, String verificationUrl) {
        String safeName = displayName == null || displayName.isBlank() ? "there" : escapeHtml(displayName);
        String safeUrl = escapeHtml(verificationUrl);

        return "<!DOCTYPE html>"
                + "<html><body style=\"margin:0; padding:0; background-color:#f6f7f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937;\">"
                + "  <div style=\"max-width:540px; margin:0 auto; padding:32px 24px;\">"
                + "    <div style=\"background-color:#ffffff; border-radius:16px; padding:32px; box-shadow:0 4px 12px rgba(0,0,0,0.06);\">"
                + "      <div style=\"text-align:center; margin-bottom:24px;\">"
                + "        <div style=\"display:inline-block; width:56px; height:56px; border-radius:14px; background-color:#3b82f6; color:#ffffff; font-size:24px; font-weight:700; line-height:56px;\">T</div>"
                + "        <h1 style=\"margin:16px 0 4px 0; font-size:22px; color:#111827;\">Welcome to TaskApp</h1>"
                + "      </div>"
                + "      <p style=\"font-size:15px; line-height:1.5; margin:0 0 16px 0;\">Hi " + safeName + ",</p>"
                + "      <p style=\"font-size:15px; line-height:1.5; margin:0 0 24px 0;\">"
                + "        Thanks for signing up. Please confirm your email address by clicking the button below. "
                + "        This link will expire in 24 hours."
                + "      </p>"
                + "      <div style=\"text-align:center; margin:32px 0;\">"
                + "        <a href=\"" + safeUrl + "\" "
                + "           style=\"display:inline-block; padding:14px 28px; background-color:#3b82f6; color:#ffffff; "
                + "                  text-decoration:none; border-radius:10px; font-weight:600; font-size:15px;\">"
                + "          Verify my email"
                + "        </a>"
                + "      </div>"
                + "      <p style=\"font-size:13px; line-height:1.5; color:#6b7280; margin:0 0 8px 0;\">"
                + "        Or copy and paste this link into your browser:"
                + "      </p>"
                + "      <p style=\"font-size:13px; line-height:1.4; color:#3b82f6; word-break:break-all; margin:0 0 24px 0;\">"
                + "        " + safeUrl
                + "      </p>"
                + "      <hr style=\"border:none; border-top:1px solid #e5e7eb; margin:24px 0;\">"
                + "      <p style=\"font-size:12px; color:#9ca3af; margin:0;\">"
                + "        If you didn't sign up for TaskApp, you can safely ignore this email."
                + "      </p>"
                + "    </div>"
                + "  </div>"
                + "</body></html>";
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
