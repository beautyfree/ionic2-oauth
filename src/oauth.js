import {NativePlugin} from 'ionic/ionic';

/**
 * Get oauth data.
 *
 * @usage
 * ```js
 * Oauth.vkontakte(clientId, appScope).then(resp => {
 *  //resp
 * })
 * ```
 */

@NativePlugin({
  name: 'Oauth',
  platforms: ['ios', 'android', 'web'],
  engines: {
    cordova: 'cordova-plugin-inappbrowser'
  },
  pluginCheck: () => {
    return window.cordova && window.cordova.InAppBrowser;
  }
})
export class Oauth {

  /*
   * Sign into the Vkontakte service
   *
   * @param    string clientId
   * @param    array appScope (for example: 'friends,wall,photos,messages')
   * @return   promise
   */
  static vkontakte(clientId, appScope) {
    return this.ifPlugin(() => {
      return new Promise((resolve, reject) => {
        let browserRef = window.open('https://oauth.vk.com/authorize?client_id=' + clientId + '&redirect_uri=http://oauth.vk.com/blank.html&response_type=token&scope=' + appScope.join(',') + '&display=touch&response_type=token', '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
        browserRef.addEventListener('loadstart', (event) => {
          let tmp = (event.url).split('#');
          if (tmp[0] != 'https://oauth.vk.com/blank.html' && tmp[0] != 'http://oauth.vk.com/blank.html') {
            return
          }

          browserRef.removeEventListener('exit', (event) => {});
          browserRef.close();
          let callbackResponse = (event.url).split('#')[1];
          let responseParameters = (callbackResponse).split('&');
          let parameterMap = [];
          for(let i = 0; i < responseParameters.length; i++) {
            parameterMap[responseParameters[i].split('=')[0]] = responseParameters[i].split('=')[1];
          }
          if(parameterMap.access_token !== undefined && parameterMap.access_token !== null) {
            let output = { access_token: parameterMap.access_token, expires_in: parameterMap.expires_in };
            if(parameterMap.email !== undefined && parameterMap.email !== null){
              output.email = parameterMap.email;
            }
            resolve(output);
          } else {
            reject('Problem authenticating');
          }
        });
        browserRef.addEventListener('exit', (event) => {
          reject('The sign in flow was canceled');
        });
      })
    })
  }


  /*
   * Sign into the Twitter service
   * Note that this service requires jsSHA for generating HMAC-SHA1 Oauth 1.0 signatures
   *
   * @param    string clientId
   * @param    string clientSecret
   * @return   promise
   */
  static twitter(clientId, clientSecret, options) {
    return this.ifPlugin(() => {
      return new Promise((resolve, reject) => {
        let redirect_uri = 'http://localhost/callback';
        if (options !== undefined && options.hasOwnProperty('redirect_uri')) {
          redirect_uri = options.redirect_uri;
        }
        if (typeof jsSHA !== 'undefined') {
          let oauthObject = {
            oauth_consumer_key: clientId,
            oauth_nonce: OauthUtility.createNonce(10),
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: Math.round((new Date()).getTime() / 1000.0),
            oauth_version: '1.0'
          };
          let signatureObj = OauthUtility.createSignature('POST', 'https://api.twitter.com/oauth/request_token', oauthObject, { oauth_callback: redirect_uri }, clientSecret);
          $http({
            method: 'post',
            url: 'https://api.twitter.com/oauth/request_token',
            headers: {
              'Authorization': signatureObj.authorization_header,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: 'oauth_callback=' + encodeURIComponent(redirect_uri)
          })
            .success((requestTokenResult) => {
              let requestTokenParameters = (requestTokenResult).split('&');
              let parameterMap = {};
              for (let i = 0; i < requestTokenParameters.length; i++) {
                parameterMap[requestTokenParameters[i].split('=')[0]] = requestTokenParameters[i].split('=')[1];
              }
              if (parameterMap.hasOwnProperty('oauth_token') === false) {
                reject('Oauth request token was not received');
              }
              let browserRef = window.open('https://api.twitter.com/oauth/authenticate?oauth_token=' + parameterMap.oauth_token, '_blank', 'location=no,clearsessioncache=yes,clearcache=yes');
              browserRef.addEventListener('loadstart', (event) => {
                if ((event.url).indexOf(redirect_uri) !== 0) {
                  return
                }

                let callbackResponse = (event.url).split('?')[1];
                let responseParameters = (callbackResponse).split('&');
                let parameterMap = {};
                for (let i = 0; i < responseParameters.length; i++) {
                  parameterMap[responseParameters[i].split('=')[0]] = responseParameters[i].split('=')[1];
                }
                if (parameterMap.hasOwnProperty('oauth_verifier') === false) {
                  reject('Browser authentication failed to complete.  No oauth_verifier was returned');
                }
                delete oauthObject.oauth_signature;
                oauthObject.oauth_token = parameterMap.oauth_token;
                let signatureObj = OauthUtility.createSignature('POST', 'https://api.twitter.com/oauth/access_token', oauthObject, { oauth_verifier: parameterMap.oauth_verifier }, clientSecret);
                $http({
                  method: 'post',
                  url: 'https://api.twitter.com/oauth/access_token',
                  headers: {
                    'Authorization': signatureObj.authorization_header
                  },
                  params: {
                    'oauth_verifier': parameterMap.oauth_verifier
                  }
                })
                  .success((result) => {
                    let accessTokenParameters = result.split('&');
                    let parameterMap = {};
                    for (let i = 0; i < accessTokenParameters.length; i++) {
                      parameterMap[accessTokenParameters[i].split('=')[0]] = accessTokenParameters[i].split('=')[1];
                    }
                    if (parameterMap.hasOwnProperty('oauth_token_secret') === false) {
                      reject('Oauth access token was not received');
                    }
                    resolve(parameterMap);
                  })
                  .error((error) => {
                    reject(error);
                  })
                  .finally(() => {
                    setTimeout(() => {
                      browserRef.close();
                    }, 10);
                  });
              });
              browserRef.addEventListener('exit', (event) => {
                reject('The sign in flow was canceled');
              });
            })
            .error((error) => {
              reject(error);
            });
        } else {
          reject('Missing jsSHA JavaScript library');
        }
      });
    });
  }
}

class OauthUtility {
  /*
   * Sign an Oauth 1.0 request
   *
   * @param    string method
   * @param    string endPoint
   * @param    object headerParameters
   * @param    object bodyParameters
   * @param    string secretKey
   * @param    string tokenSecret (optional)
   * @return   object
   */
  static createSignature(method, endPoint, headerParameters, bodyParameters, secretKey, tokenSecret) {
    if(typeof jsSHA !== 'undefined') {
      let headerAndBodyParameters = angular.copy(headerParameters);
      let bodyParameterKeys = Object.keys(bodyParameters);
      for(let i = 0; i < bodyParameterKeys.length; i++) {
        headerAndBodyParameters[bodyParameterKeys[i]] = encodeURIComponent(bodyParameters[bodyParameterKeys[i]]);
      }
      let signatureBaseString = method + '&' + encodeURIComponent(endPoint) + '&';
      let headerAndBodyParameterKeys = (Object.keys(headerAndBodyParameters)).sort();
      for(i = 0; i < headerAndBodyParameterKeys.length; i++) {
        if(i == headerAndBodyParameterKeys.length - 1) {
          signatureBaseString += encodeURIComponent(headerAndBodyParameterKeys[i] + '=' + headerAndBodyParameters[headerAndBodyParameterKeys[i]]);
        } else {
          signatureBaseString += encodeURIComponent(headerAndBodyParameterKeys[i] + '=' + headerAndBodyParameters[headerAndBodyParameterKeys[i]] + '&');
        }
      }
      let oauthSignatureObject = new jsSHA(signatureBaseString, 'TEXT');

      let encodedTokenSecret = '';
      if (tokenSecret) {
        encodedTokenSecret = encodeURIComponent(tokenSecret);
      }

      headerParameters.oauth_signature = encodeURIComponent(oauthSignatureObject.getHMAC(encodeURIComponent(secretKey) + '&' + encodedTokenSecret, 'TEXT', 'SHA-1', 'B64'));
      let headerParameterKeys = Object.keys(headerParameters);
      let authorizationHeader = 'OAuth ';
      for(i = 0; i < headerParameterKeys.length; i++) {
        if(i == headerParameterKeys.length - 1) {
          authorizationHeader += headerParameterKeys[i] + '='' + headerParameters[headerParameterKeys[i]] + ''';
        } else {
          authorizationHeader += headerParameterKeys[i] + '='' + headerParameters[headerParameterKeys[i]] + '',';
        }
      }
      return { signature_base_string: signatureBaseString, authorization_header: authorizationHeader, signature: headerParameters.oauth_signature };
    } else {
      return 'Missing jsSHA JavaScript library';
    }
  }

  /*
  * Create Random String Nonce
  *
  * @param    integer length
  * @return   string
  */
  static createNonce(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for(let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  static generateUrlParameters(parameters) {
    let sortedKeys = Object.keys(parameters);
    sortedKeys.sort();

    let params = '';
    let amp = '';

    for (let i = 0 ; i < sortedKeys.length; i++) {
      params += amp + sortedKeys[i] + '=' + parameters[sortedKeys[i]];
      amp = '&';
    }

    return params;
  }

  static parseResponseParameters(response) {
    if (response.split) {
      let parameters = response.split('&');
      let parameterMap = {};
      for(let i = 0; i < parameters.length; i++) {
        parameterMap[parameters[i].split('=')[0]] = parameters[i].split('=')[1];
      }
      return parameterMap;
    }
    else {
      return {};  
    }
  }

  static generateOauthParametersInstance(consumerKey) {
    let nonceObj = new jsSHA(Math.round((new Date()).getTime() / 1000.0), 'TEXT');
    let oauthObject = {
      oauth_consumer_key: consumerKey,
      oauth_nonce: nonceObj.getHash('SHA-1', 'HEX'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.round((new Date()).getTime() / 1000.0),
      oauth_version: '1.0'
    };
    return oauthObject;
  }
}