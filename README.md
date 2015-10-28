based on [ng-cordova-oauth](https://github.com/nraboy/ng-cordova-oauth)


# ionic2-oauth

ionic2-oauth is an Angular 2 Apache Cordova Oauth library.  The purpose of this library is to quickly and easily obtain an access token from various web services to use their APIs.


## Requirements

Apache Cordova 3.5+

[Apache Cordova InAppBrowser Plugin](http://cordova.apache.org/docs/en/3.0.0/cordova_inappbrowser_inappbrowser.md.html)

[Apache Cordova Whitelist Plugin](https://github.com/apache/cordova-plugin-whitelist)

\* [jsSHA 1.6.0](https://github.com/Caligatio/jsSHA) Secure Hash Library (Twitter, Withings, and Magento only)

---

\* To authenticate with Twitter, Withings, and Magento an additional library is required.  These services require HMAC-SHA1 signatures in their Oauth implementation.  Including the sha1.js component of jsSHA will accomplish this task.

As of Apache Cordova 5.0.0, the [whitelist plugin](https://blog.nraboy.com/2015/05/whitelist-external-resources-for-use-in-ionic-framework/) must be used in order to reach external web services.

This library will NOT work with a web browser, ionic serve, or ionic view.  It must be used via installing to a device or simulator.

## Using ionic2-oauth In Your Project

Each web service API acts independently in this library.  However, when configuring each web service, one thing must remain consistent.  You must use **http://localhost/callback** as your callback / redirect URI.  This is because this library will perform tasks when this URL is found.
    
    Oauth.twitter(string consumerKey, string consumerSecretKey, object options);
    Oauth.vkontakte(string clientId, array appScope)


Each API call returns a promise.  The success callback will provide a response object and the error
callback will return a string.

    Oauth.vkontakte('CLIENT_ID_HERE', ['email']).then((result) => {
      console.log('Response Object:', result);
    }, (error) => {
      console.log('Error:', error);
    });

## Contribution Rules

All contributions must be made via the `development` branch.  This keeps the project more maintainable in terms of versioning as well as code control.


## Have a question or found a bug (compliments work too)?

Tweet me on Twitter - [@netebe](https://www.twitter.com/netebe)


## Resources

Ionic 2 - [http://www.ionicframework.com](http://www.ionicframework.com)

Angular 2 - [hhttps://angular.io/](https://angular.io/)

Apache Cordova - [http://cordova.apache.org](http://cordova.apache.org)