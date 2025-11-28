import NextAuth from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import Resend from "next-auth/providers/resend";
import { Resend as ResendClient } from "resend";
import { render } from "@react-email/render";
import MagicLinkEmail from "@/emails/MagicLinkEmail";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create Resend client
const resend = new ResendClient(process.env.RESEND_API_KEY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "Outrage <noreply@mail.outrage.gg>",
      async sendVerificationRequest({ identifier: email, url }) {
        try {
          console.log("[AUTH] Sending magic link email to:", email);
          const emailHtml = await render(MagicLinkEmail({ url }));
          console.log("[AUTH] Email HTML type:", typeof emailHtml);
          console.log("[AUTH] Email HTML preview:", emailHtml.substring(0, 100));

          const result = await resend.emails.send({
            from: "Outrage <noreply@mail.outrage.gg>",
            to: email,
            subject: "Sign in to Outrage!!",
            html: emailHtml,
          });
          console.log("[AUTH] Email sent successfully:", result);
        } catch (error) {
          console.error("[AUTH] Failed to send verification email:", error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/", // Users will sign in from the main page
    verifyRequest: "/", // Show verification message on main page
    error: "/", // Error page
  },
  callbacks: {
    async session({ session, user }) {
      // Add user id to session
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
});
