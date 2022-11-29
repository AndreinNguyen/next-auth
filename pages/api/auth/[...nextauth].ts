import NextAuth, { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";

import KeycloakProvider from "next-auth/providers/keycloak";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options

async function refreshAccessToken(token: JWT) {
  try {
    console.log("run in refreshAccessToken");

    if (Date.now() > token.refreshTokenExpired) throw Error;
    // const details = {
    //   client_id: 'fitness-app',
    //   client_secret: 'SmeYEExCsyBLDcKfoAKVEg7VXnzB8vpe',
    //   grant_type: ['refresh_token'],
    //   refresh_token: token.refreshToken,
    // };
    // const formBody: string[] = [];

    // Object.entries(details).forEach(([key, value]: [string, string]) => {
    //   const encodedKey = encodeURIComponent(key);
    //   const encodedValue = encodeURIComponent(value);
    //   formBody.push(encodedKey + '=' + encodedValue);
    // });
    // console.log({ formBody });

    const params = {
      grant_type: "authorization_code",
      code: token.refreshToken,
      redirect_uri: "https://lab-fitness.savvycom.xyz/sso/callback",
      client_id: "fitness-app",
      client_secret: "SmeYEExCsyBLDcKfoAKVEg7VXnzB8vpe",
    };

    const formBody: string[] = [];

    Object.entries(params).forEach(([key, value]: [string, string]) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(value);
      formBody.push(encodedKey + "=" + encodedValue);
    });

    console.log({ formBody });

    const formData = formBody.join("&");
    const url = `https://lab-ids.savvycom.xyz/realms/savvy-fitness/protocol/openid-connect/token`;
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
    console.log("🚫🚫🚫 error 🚫🚫🚫");
    console.error({ error });
    let ErrMessage;
    // switch (error.error) {
    //   case "invalid_grant":
    //     ErrMessage = "SessionNotActive";
    //     break;

    //   default:
    //     ErrMessage = "RefreshAccessTokenError";
    //     break;
    // }
    return {
      ...token,
      error: ErrMessage,
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: "fitness-app",
      clientSecret: "SmeYEExCsyBLDcKfoAKVEg7VXnzB8vpe",
      issuer: "https://lab-ids.savvycom.xyz/realms/savvy-fitness",
      idToken: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      console.log({ token, user, account, profile });

      // Initial sign in
      if (account && user && profile) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: account.expires_at * 1000,
          refreshToken: account.refresh_token,
          user,
          account,
        };
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        console.log(token);
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token);
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        // Return all data into user
        session.token = token;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
