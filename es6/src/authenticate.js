
import { contains } from 'underscore';
import { Strategy as JwtStrategy } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import config from 'config';

import { nano_db } from './util/couch';

const secret = config.get( 'token.secret' );
const issuer = config.get( 'token.iss' );
const expiresIn = config.get( 'token.exp' );

const algorithm = 'HS256';

/*
 * Passport strategy to determine if a token-holder is a moderator.
 */
export const strategy = new JwtStrategy( {
  issuer,
  algorithms: [ algorithm ],
  secretOrKey: secret,
  authScheme: 'JWT'
},
  ( jwt_payload, done ) => {
    if ( contains( jwt_payload.roles, 'moderator' ) ) {
      done( null, jwt_payload );
    } else {
      done( 'you are not a moderator', false );
    }
  } );

/*
 * Sign a token with our server's secret. The token's payload will contains
 * the user's email and assigned roles.
 */
function createToken( email, roles ) {
  return jwt.sign( { email, roles }, secret, { issuer, algorithm, expiresIn } );
}

/*
 * Express route to authenticate a user given their email and password.
 * Currently, the nano driver is used to authenticate users. This includes
 * asking CouchDB to create a new session for the user. The session creation
 * request returns the users' defined roles.
 */
export default function authenticate( req, res ) {
  const {email, password} = req.body;

  if ( email === '' || password === '' ) {
    return res.status( 400 ).json( {
      'bad request': 'you must supply a valid email and password'
    } );
  }

  nano_db.auth( email, password, ( err, body, headers ) => {
    if ( err ) {
      return res.status( 400 ).json( {
        unauthorized: 'either your email, password , or both are incorrect'
      } );
    } else {
      return res.status( 200 ).json( {
        ok: 'a token has been provided',
        auth_token: createToken( email, body.roles )
      } );
    }
  } );
}