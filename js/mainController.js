/* global EmojiPicker */
'use strict';

angular.module('fireideaz').controller('MainCtrl', ['$scope', '$filter', '$window', 'Utils', '$rootScope', 'ModalService', 'FEATURES', '$feathers','$timeout',
  function ($scope, $filter, $window, utils, $rootScope, modalService, FEATURES, $feathers,$timeout) {
    var messageService = $feathers.service('message')
    var boardService = $feathers.service('board')

    messageService.on('patched', function (msg) {
      console.log('msg patched:', msg)
      // var index = $scope.messages.findIndex((obj => obj._id == msg._id));
      // $scope.messages[index] = msg;

    }).on('removed', function (msg) {
      _.remove($scope.messages, function (el) {
        return el._id === msg._id;
      })
      $scope.$apply();
      console.log('msg removed:', msg);
    }).on('created',function(msg){

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
          boardId: $scope.boardId
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

    $scope.updatePrivateWritingToggle = function (privateWritingOn) {
      $scope.boardRef.update({
        text_editing_is_private: privateWritingOn
      });
    };

    // $scope.updateEditingMessage = function (message, value) {
    //   message.creating = value;
    //   $scope.patchMessage(message)
    // };

    $scope.getSortFields = function () {
      return $scope.sortField === 'votes' ? ['-votes', 'date_created'] :
        'date_created';
    };

    $scope.patchMessage = function (msg) {
      messageService.patch(msg._id, angular.copy(msg)).catch((error) => {
        console.log(error);
      })
    }

    // $scope.saveMessage = function (message) {
    //   message.creating = false;
    //   $scope.patchMessage(message);
    // };

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
      modalService.closeAll();
      boardService.create({
        boardName: $scope.newBoard.name,
        date_created: new Date().toString(),
        columns: $scope.messageTypes,
        user_id: utils.createUserId(),
        max_votes: $scope.newBoard.max_votes || 6,
        text_editing_is_private: $scope.newBoard.text_editing_is_private
      }).then(function (result) {
        console.log(result);
        redirectToBoard(result);
      }).catch(function (error) {
        console.error(error)
      })
      $scope.newBoard.name = '';
    };

    $scope.patchBoard = function () {
      boardService.patch($scope.board._id, {
        boardName: $scope.board.boardName,
        boardContext: $scope.board.boardContext
      }).then(function (data) {
        $scope.board = data;
      }).catch(function (error) {
        console.error(error)
      })
      modalService.closeAll();
    }

    $scope.updateSortOrder = function () {
      var updatedFilter =
        $window.location.origin +
        $window.location.pathname +
        '?sort=' +
        $scope.sortField +
        $window.location.hash;
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
      boardService.patch($scope.board._id, {
        $pull: {
          columns: {
            id: column.id
          }
        }
      }).catch(function (error) {
        console.error(error)
      });
      modalService.closeAll();
    };

    $scope.deleteMessage = function (message) {
      messageService.remove(message._id).then(function (msg) {
        modalService.closeAll();
      })
    };

    function addMessageCallback(message) {
      var element = $("[messageid='" + message._id + "']");
      angular.element(element).scope().isEditing = true;
      new EmojiPicker();
      $timeout(function(){
        element.find('textarea').focus();
      },0);
    }

    $scope.addNewMessage = function (type) {
      messageService.create({
        text: '',
        creating: true,
        user_id: $scope.userUid,
        type: {
          id: type.id
        },
        date: Date.now(),
        date_created: Date.now(),
        votes: 0
      }).then(function (msg) {
        $scope.messages.push(msg);
        $scope.$apply();
        return msg;
      }).then(addMessageCallback).catch(function (error) {
        console.error(error)
      })
    };

    $scope.deleteCards = function () {
      $($scope.messages).each(function (index, message) {
        $scope.messages.$remove(message);
      });

      modalService.closeAll();
    };

    $scope.deleteBoard = function () {
      $scope.deleteCards();
      $scope.boardRef.ref.remove();

      modalService.closeAll();
      window.location.hash = '';
      location.reload();
    };

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