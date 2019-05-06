'use strict';

angular.module('fireideaz').controller('MessageCtrl', ['$scope', '$window', 'ModalService', 'VoteService', '$feathers',
  function ($scope, $window, modalService, voteService, $feathers) {
    var messageService = $feathers.service('message');
    $scope.modalService = modalService;

    $scope.dropCardOnCard = function (dragEl, dropEl) {
      if (dragEl !== dropEl) {
        $scope.dragEl = dragEl;
        $scope.dropEl = dropEl;
        modalService.openMergeCards($scope);
      }
    };

    $scope.dropped = function (dragEl, dropEl) {
      var first = $('#' + dragEl).attr('messageId');
      var second = $('#' + dropEl).attr('messageId');
      messageService.find({
        query: {
          _id: {
            $in: [first, second]
          }
        }
      }).then((result)=>{
        var text = _.join(_.map(result,'text'),'\n');
        var votes = _.union(_.flatten(_.concat(_.map(result,'votes'))));
        messageService.patch(second,{
          text: text,
          votes:votes
        })
        messageService.remove(first);
        modalService.closeAll();
      })
    };
  }
]);