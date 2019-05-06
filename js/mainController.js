/* global EmojiPicker */
'use strict';

angular.module('fireideaz').controller('MainCtrl', ['$cookies', '$scope', '$filter', '$window', 'Utils', '$rootScope', 'ModalService', 'FEATURES', '$feathers', '$timeout',
  function ($cookies, $scope, $filter, $window, utils, $rootScope, modalService, FEATURES, $feathers, $timeout) {

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
    $scope.features = FEATURES;
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
    if (!$scope.user) {
      $timeout(function () {
        modalService.openLoginUser($scope);
      })
    }
    $scope.saveUser = function () {
      $cookies.put('user', $scope.user)
      modalService.closeAll();
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
      return $scope.sortField === 'votes' ? ['-votes', 'date_created'] :
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

    $scope.isMaxVotesValid = function () {
      return Number.isInteger($scope.newBoard.max_votes);
    };

    $scope.createNewBoard = function () {
      $scope.loading = true;
      boardService.create({
        boardName: $scope.newBoard.name,
        date_created: Date.now(),
        columns: $scope.messageTypes,
        user: $scope.user,
        max_votes: $scope.newBoard.max_votes || 6,
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
      alert(msg);
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

    function addMessageCallback(message) {

    }

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

    $scope.toggerVote = function(message){
      if(message.votes.indexOf($scope.user)==-1){
        messageService.patch(message._id, {$push: { votes: $scope.user } }).catch((error) => {
          console.log(error);
        })
      }else{
        messageService.patch(message._id, {$pull: { votes: $scope.user } }).catch((error) => {
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

    $scope.cleanImportData = function () {
      $scope.import.data = [];
      $scope.import.mapping = [];
      $scope.import.error = '';
    };

    /* globals Clipboard */
    new Clipboard('.import-btn');

    function reloadBoard() {
      $scope.loading = true;
      $scope.boardId = $window.location.hash.substring(1) || '';
      getBoardAndMessages($scope.boardId)
    }
    angular.element($window).bind('hashchange', reloadBoard);
    reloadBoard();
  }
]);