angular.module('fireideaz', ['ngCookies','ngFeathers','ngDialog','lvl.directives.dragdrop','ngSanitize','ngAria','ngFileUpload','ngAnimate', 'toastr'])
.config(function ($feathersProvider) {
  $feathersProvider.setEndpoint('http://localhost:3030')
  // You can optionally provide additional opts for socket.io-client
  $feathersProvider.setSocketOpts({
    path: '/ws/'
  })
  // true is default; set to false if you like to use REST
  $feathersProvider.useSocket(true)
});
