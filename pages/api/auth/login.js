export default function handler(req, res) {
  const client_id = process.env.NAVER_CLIENT_ID;
  const redirectURI = encodeURI(`${process.env.BASE_URL}/api/auth/callback`);
  const state = Math.random().toString(36).substring(7);
  
  res.redirect(`https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirectURI}&state=${state}`);
}