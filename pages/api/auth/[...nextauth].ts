import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";
import KeycloakProvider from "next-auth/providers/keycloak";

async function refreshAccessToken(token: JWT) {
  try {
    if (Date.now() > token.refreshTokenExpired) throw Error;
    const details = {
      client_id: process.env.NX_NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
      client_secret: process.env.NX_NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET,
      grant_type: ["refresh_token"],
      refresh_token: token.refreshToken,
    };
    const formBody: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.entries(details).forEach(([key, value]: [string, any]) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(value);
      formBody.push(encodedKey + "=" + encodedValue);
    });
    const formData = formBody.join("&");
    const url = `${process.env.NX_NEXT_PUBLIC_KEYCLOAK_BASE_URL}/token`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: formData,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
      refreshTokenExpired:
        Date.now() + refreshedTokens.refresh_expires_in * 1000,
    };
  } catch (error) {
    console.log("error", error);
    let ErrMessage;
    switch (error.error) {
      case "invalid_grant":
        ErrMessage = "SessionNotActive";
        break;

      default:
        ErrMessage = "RefreshAccessTokenError";
        break;
    }
    return {
      ...token,
      error: ErrMessage,
    };
  }
}

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: `${process.env.NX_NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}`,
      clientSecret: `${process.env.NX_NEXT_PUBLIC_KEYCLOAK_CLIENT_SECRET}`,
      issuer: `${process.env.NX_NEXT_PUBLIC_KEYCLOAK_ISSUER}`,
      idToken: true,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Initial sign in
      // if (account && user && profile) {
      //   user.familyName = profile.family_name;
      //   user.givenName = profile.given_name;
      //   user.emailVerified = profile.email_verified;
      //   return {
      //     accessToken: account.access_token,
      //     accessTokenExpires: account.expires_at * 1000,
      //     refreshToken: account.refresh_token,
      //     user,
      //     account,
      //   };
      // }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token) {
        // Return all data into user
        session.user = { ...token.user, ...token.account, ...token.profile };
        session.accessToken = token.accessToken;
        session.error = token.error;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      // split from callbackUrl {'signOut?idToken'}
      const urlSplit = url.split("?");
      const idToken = urlSplit[1];
      // This is the beef:
      if (urlSplit[0] === "signOut") {
        const ssoLogoutUrl = `${process.env.NX_NEXT_PUBLIC_KEYCLOAK_BASE_URL}/logout`;
        const redirectUrl = process.env.NEXTAUTH_URL;
        const signOutWithRedirectUrl = `${ssoLogoutUrl}?post_logout_redirect_uri=${encodeURIComponent(
          redirectUrl
        )}&id_token_hint=${idToken}`;
        return signOutWithRedirectUrl;
      }
      // Allows relative callback URLs
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      return baseUrl;
    },
  },
};
export default NextAuth(authOptions);
