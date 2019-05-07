angular.module('fireideaz', ['ngCookies','ngFeathers','ngDialog','lvl.directives.dragdrop','ngSanitize','ngAria','ngFileUpload','ngAnimate', 'toastr'])
.config(function ($feathersProvider) {
  var $cookies;
  angular.injector(['ngCookies']).invoke(['$cookies', function(_$cookies_) {
    $cookies = _$cookies_;
  }]);

  var endpoint = $cookies.get('endpoint') || 'http://localhost:3030';
  $feathersProvider.setEndpoint(endpoint)
  // You can optionally provide additional opts for socket.io-client
  $feathersProvider.setSocketOpts({
    path: '/ws/'
  })
  // true is default; set to false if you like to use REST
  $feathersProvider.useSocket(true)
});
