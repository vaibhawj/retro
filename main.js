angular.module('fireideaz', ['ngCookies','ngFeathers','ngDialog','lvl.directives.dragdrop','ngSanitize','ngAria','ngFileUpload','ngAnimate', 'toastr'])
.config(function ($feathersProvider) {
  var $cookies;
  angular.injector(['ngCookies']).invoke(['$cookies', function(_$cookies_) {
    $cookies = _$cookies_;
  }]);
  var endpoint = $cookies.get('endpoint') || 'http://localhost:3030';
  $feathersProvider.setEndpoint(endpoint);
  // You can optionally provide additional opts for socket.io-client
  $feathersProvider.setSocketOpts({
    path: '/ws/'
  })
  // true is default; set to false if you like to use REST
  $feathersProvider.useSocket(true)
});

/* global EmojiPicker */
'use strict';

angular.module('fireideaz').controller('MainCtrl', ['$cookies', '$scope', '$filter', '$window', 'Utils', '$rootScope', 'ModalService', '$feathers', '$timeout', 'toastr',
  function ($cookies, $scope, $filter, $window, utils, $rootScope, modalService, $feathers, $timeout, toastr) {

    var messageService = $feathers.service('message')
    var boardService = $feathers.service('board')

    messageService.on('patched', function (msg) {
      if (msg.creating) {
        var element = $("[messageid='" + msg._id + "']");
        if (angular.element(element).scope().isEditing) {
          return;
        }
      }
      var index = $scope.messages.findIndex((obj => obj._id == msg._id));
      $scope.messages[index] = msg;
      $scope.$apply();
      console.log('msg patched:', msg)
    }).on('removed', function (msg) {
      _.remove($scope.messages, function (el) {
        return el._id === msg._id;
      })
      $scope.$apply();
      console.log('msg removed:', msg);
    }).on('created', function (msg) {
      $scope.messages.push(msg);
      $scope.$apply();
      console.log('msg created:', msg);
    })

    boardService.on('patched', function (board) {
      if (board._id == $scope.board._id) {
        $scope.board = board;
        $scope.$apply();
      }
      console.log('board patched:', board)
    })

    $scope.loading = true;
    $scope.messageTypes = utils.messageTypes;
    $scope.utils = utils;
    $scope.newBoard = {
      name: '',
      text_editing_is_private: true
    };
    $scope.searchParams = {};
    $window.location.search.substr(1).split('&').forEach(function (pair) {
      var keyValue = pair.split('=');
      $scope.searchParams[keyValue[0]] = keyValue[1];
    });
    $scope.sortField = $scope.searchParams.sort || 'date_created';
    $scope.selectedType = 1;
    $scope.import = {
      data: [],
      mapping: []
    };

    $scope.user = $cookies.get('user');
    $timeout(function(){
      if(!$scope.user){
        modalService.openLoginUser($scope);
      }
    })

    $scope.saveUser = function () {
      $cookies.put('user', $scope.user);
      modalService.closeAll();
    }

    $scope.endpoint = $cookies.get('endpoint');
    $scope.saveEndpoint =function(){
      $cookies.put('endpoint', $scope.endpoint);
      location.reload();
    }

    $scope.droppedEvent = function (dragEl, dropEl) {
      var drag = $('#' + dragEl);
      var drop = $('#' + dropEl);
      var dragMessageRef = firebaseService.getMessageRef(
        $scope.userId,
        drag.attr('messageId')
      );

      dragMessageRef.once('value', function () {
        dragMessageRef.update({
          type: {
            id: drop.data('column-id')
          }
        });
      });
    };

    function getBoardAndMessages(boardId) {
      if (boardId) {
        var boardReq = boardService.get($scope.boardId).then(function (board) {
          $scope.board = board;
        });

        var messageReq = messageService.find({
          query: {
            boardId: $scope.boardId
          }
        }).then(function (msgs) {
          $scope.messages = msgs;
        })

        Promise.all([boardReq, messageReq]).then(function () {
          $scope.loading = false;
          $scope.$apply();
        }).catch(function (error) {
          if (error) {
            console.error(error)
            $scope.boardId = undefined;
            $scope.loading = false;
            alert(error);
            $scope.$apply();
          }
        });

      } else {
        $scope.loading = false;
      }
    }

    $scope.isColumnSelected = function (type) {
      return parseInt($scope.selectedType) === parseInt(type);
    };

    $scope.isCensored = function (message, privateWritingOn) {
      return message.creating && privateWritingOn;
    };

    $scope.getSortFields = function () {
      return $scope.sortField === 'votes' ? ['-votes.length', 'date_created'] :
        'date_created';
    };

    $scope.patchMessage = function (msg) {
      messageService.patch(msg._id, angular.copy(msg)).catch((error) => {
        console.log(error);
      })
    }

    function redirectToBoard(board) {
      window.location.href = window.location.origin + window.location.pathname + '#' + board._id;
      $scope.loading = false;
    }

    $scope.isBoardNameInvalid = function () {
      return !$scope.newBoard.name;
    };

    $scope.createNewBoard = function () {
      $scope.loading = true;
      boardService.create({
        boardName: $scope.newBoard.name,
        date_created: Date.now(),
        columns: $scope.messageTypes,
        user: $scope.user,
        text_editing_is_private: $scope.newBoard.text_editing_is_private
      }).then(function (result) {
        console.log(result);
        redirectToBoard(result);
      }).catch(function (error) {
        console.error(error)
      })
      $scope.newBoard.name = '';
      modalService.closeAll();
    };

    $scope.patchBoard = function () {
      boardService.patch($scope.board._id, angular.copy($scope.board))
        .catch(function (error) {
          console.error(error)
        })
      modalService.closeAll();
    }

    $scope.updateSortOrder = function () {
      var updatedFilter = $window.location.origin + $window.location.pathname + '?sort=' + $scope.sortField + $window.location.hash;
      $window.history.pushState({
        path: updatedFilter
      }, '', updatedFilter);
    };

    $scope.addNewColumn = function (name) {
      if (name) {
        boardService.patch($scope.board._id, {
          $push: {
            columns: {
              value: name,
              id: utils.getNextId($scope.board)
            }
          }
        }).catch(function (error) {
          console.error(error)
        });
      }
      modalService.closeAll();
    };

    $scope.changeColumnName = function (id, newName) {
      if (newName) {
        var index = $scope.board.columns.findIndex(x => x.id === id);
        boardService.patch($scope.board._id, {
          $set: {
            ['columns.' + index + '.value']: newName
          }
        }).catch(function (error) {
          console.error(error)
        });
      }
      modalService.closeAll();
    };

    $scope.deleteColumn = function (column) {
      if ($scope.board.user == $scope.user) {
        boardService.patch($scope.board._id, {
          $pull: {
            columns: {
              id: column.id
            }
          }
        }).catch(function (error) {
          console.error(error)
        });
      } else {
        showMessage('permission denied')
      }
      modalService.closeAll();
    };

    function showMessage(msg) {
      modalService.closeAll();
      toastr.error(msg, 'Error');
    }
    $scope.editMessage = function (message) {
      message.creating = true;
      new EmojiPicker();
      utils.focusElement(message._id);
      $scope.patchMessage(message);
    }

    $scope.deleteMessage = function (message) {
      if (message.user == $scope.user) {
        messageService.remove(message._id).then(function (msg) {
          modalService.closeAll();
        })
      } else {
        showMessage('permission denied')
      }
    };

    $scope.addNewMessage = function (type) {
      messageService.create({
        text: '',
        creating: true,
        boardId: $scope.boardId,
        user: $scope.user,
        type: {
          id: type.id
        },
        date: Date.now(),
        date_created: Date.now(),
        votes: []
      }).then((message) => {
        $timeout(function () {
          var element = $("[messageid='" + message._id + "']");
          angular.element(element).scope().isEditing = true;
          new EmojiPicker();
          element.find('textarea').focus();
        }, 0);
      }).catch(function (error) {
        console.error(error)
      })
    };

    $scope.deleteCards = function () {
      if ($scope.board.user == $scope.user) {
        messageService.remove(null, {
          query: {
            boardId: $scope.board._id
          }
        });
      } else {
        showMessage('permission denied')
      }
      modalService.closeAll();
    };

    $scope.deleteBoard = function () {
      if ($scope.board.user == $scope.user) {
        boardService.remove($scope.board._id);
        modalService.closeAll();
        window.location.hash = '';
        location.reload();
      } else {
        showMessage('permission denied')
      }
    };

    $scope.toggerVote = function (message) {
      if (message.votes.indexOf($scope.user) == -1) {
        messageService.patch(message._id, {
          $push: {
            votes: $scope.user
          }
        }).catch((error) => {
          console.log(error);
        })
      } else {
        messageService.patch(message._id, {
          $pull: {
            votes: $scope.user
          }
        }).catch((error) => {
          console.log(error);
        })
      }
    }

    $scope.submitOnEnter = function (event, method, data) {
      if (event.keyCode === 13) {
        switch (method) {
          case 'createNewBoard':
            if (!$scope.isBoardNameInvalid()) {
              $scope.createNewBoard();
            }

            break;
          case 'addNewColumn':
            if (data) {
              $scope.addNewColumn(data);
              $scope.newColumn = '';
            }

            break;
        }
      }
    };

    function reloadBoard() {
      $scope.loading = true;
      $scope.boardId = $window.location.hash.substring(1) || '';
      getBoardAndMessages($scope.boardId)
    }
    angular.element($window).bind('hashchange', reloadBoard);
    reloadBoard();
  }
]);
'use strict';

angular.module('fireideaz').controller('MessageCtrl', ['$scope', '$window', 'ModalService', '$feathers',
  function ($scope, $window, modalService, $feathers) {
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
      }).then((result) => {
        var text = _.join(_.map(result, 'text'), '\n');
        var votes = _.union(_.flatten(_.concat(_.map(result, 'votes'))));
        messageService.patch(second, {
          text: text,
          votes: votes
        })
        messageService.remove(first);
        modalService.closeAll();
      })
    };
  }
]);
'use strict';

angular
  .module('fireideaz')
  .service('Utils', [function () {
    function createUserId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    function focusElement(id) {
      $('#' + id).find('textarea').focus();
    }

    var messageTypes = [{
      id: 1,
      value: 'Went well'
    }, {
      id: 2,
      value: 'To improve'
    }, {
      id: 3,
      value: 'Action items'
    }, {
      id: 4,
      value: 'Sprint Star'
    }];

    function getNextId(board) {
      return board.columns.slice(-1).pop().id + 1;
    }

    function toObject(array) {
      var object = {};

      for (var i = 0; i < array.length; i++) {
        object[i] = {
          id: array[i].id,
          value: array[i].value
        };
      }

      return object;
    }

    function columnClass(id) {
      return 'column_' + (id % 6 || 6);
    }

    return {
      createUserId: createUserId,
      focusElement: focusElement,
      messageTypes: messageTypes,
      getNextId: getNextId,
      toObject: toObject,
      columnClass: columnClass
    };
  }]);

'use strict';

angular.module('fireideaz').directive('about', [function() {
    return {
      templateUrl : 'components/about.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('focus', function($timeout) {
    return function(scope, element) {
       scope.$watch('editing',
         function () {
            $timeout(function() {
                element[0].focus();
            }, 0, false);
         });
      };
});

'use strict';

angular.module('fireideaz').directive('boardContext', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/boardContext.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('dialogs', function () {
  return {
    restrict: 'E',
    templateUrl: 'components/dialogs.html',
  }
});
'use strict';

angular
.module('fireideaz')
.directive('enterClick', function () {
  return {
    restrict: 'A',
    link: function (scope, elem) {
      elem.bind('keydown', function(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          event.preventDefault();
          $(elem[0]).find('button').focus();
          $(elem[0]).find('button').click();
        }
      });
    }
  };
});

'use strict';

angular.module('fireideaz').directive('pageHeader', ['ModalService', function(modalService) {
    return {
      templateUrl : 'components/header.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainContent', [function() {
    return {
      templateUrl : 'components/mainContent.html'
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('mainPage', ['ModalService', function(modalService) {
    return {
      restrict: 'E',
      templateUrl : 'components/mainPage.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('menu', [function() {
    return {
      templateUrl : 'components/menu.html',
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('sidebar', ['ModalService', function(modalService) {
    return {
      templateUrl : 'components/sidebar.html',
      link: function($scope) {
        $scope.modalService = modalService;
      }
    };
  }]
);

'use strict';

angular.module('fireideaz').directive('spinner', [function() {
    return {
      restrict: 'E',
      templateUrl : 'components/spinner.html'
    };
  }]
);

'use strict';

angular
  .module('fireideaz')
  .service('ModalService', ['ngDialog', function (ngDialog) {
    return {
      openLoginUser: function (scope) {
        ngDialog.open({
          template: 'components/setUserName.html',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openAddNewColumn: function (scope) {
        ngDialog.open({
          template: 'addNewColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openAddNewBoard: function (scope) {
        ngDialog.open({
          template: 'addNewBoard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteCard: function (scope) {
        ngDialog.open({
          template: 'deleteCard',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteColumn: function (scope) {
        ngDialog.open({
          template: 'deleteColumn',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },

      openMergeCards: function (scope) {
        ngDialog.open({
          template: 'mergeCards',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openDeleteBoard: function (scope) {
        ngDialog.open({
          template: 'deleteBoard',
          className: 'ngdialog-theme-plain danger',
          scope: scope
        });
      },
      openDeleteCards: function (scope) {
        ngDialog.open({
          template: 'deleteCards',
          className: 'ngdialog-theme-plain danger',
          scope: scope
        });
      },
      openVoteSettings: function (scope) {
        ngDialog.open({
          template: 'voteSettings',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      openCardSettings: function (scope) {
        ngDialog.open({
          template: 'cardSettings',
          className: 'ngdialog-theme-plain',
          scope: scope
        });
      },
      closeAll: function () {
        ngDialog.closeAll();
      }
    };
  }]);