/* global EmojiPicker */
'use strict';

angular
  .module('fireideaz')

  .controller('MainCtrl', ['$scope','$filter','$window','Utils','$rootScope','FirebaseService','ModalService','FEATURES','$feathers',
    function($scope,$filter,$window,utils,$rootScope,firebaseService,modalService,FEATURES,$feathers) {

      var messageService = $feathers.service('message')
      var boardService = $feathers.service('board')
      messageService.on('patched', function (msg) {
        console.log(msg)
      })
      boardService.on('patched', function (board) {
        if(board._id ==$scope.board._id){
          $scope.board= board;
          $scope.$apply();
        }
        console.log(board)
      })

      $scope.loading = true;
      $scope.messageTypes = utils.messageTypes;
      $scope.utils = utils;
      $scope.newBoard = {
        name: '',
        text_editing_is_private: true
      };
      $scope.features = FEATURES;
      // $scope.userId = $window.location.hash.substring(1) || '';
      $scope.searchParams = {};
      $window.location.search
        .substr(1)
        .split('&')
        .forEach(function(pair) {
          var keyValue = pair.split('=');
          $scope.searchParams[keyValue[0]] = keyValue[1];
        });
      $scope.sortField = $scope.searchParams.sort || 'date_created';
      $scope.selectedType = 1;
      $scope.import = {
        data: [],
        mapping: []
      };

      $scope.droppedEvent = function(dragEl, dropEl) {
        var drag = $('#' + dragEl);
        var drop = $('#' + dropEl);
        var dragMessageRef = firebaseService.getMessageRef(
          $scope.userId,
          drag.attr('messageId')
        );

        dragMessageRef.once('value', function() {
          dragMessageRef.update({
            type: {
              id: drop.data('column-id')
            }
          });
        });
      };

      function getBoardAndMessages(boardId) {
        if(boardId){
          boardService.get($scope.boardId).then(function(board){
            $scope.board = board;
            $scope.loading = false;
            $scope.$apply();
          }).catch(function(error){
            if(error){
              $scope.boardId = undefined;
              $scope.loading = false;
              $scope.$apply();
            }
          });
        }else{
          $scope.loading = false;
        }
      }

      $scope.isColumnSelected = function(type) {
        return parseInt($scope.selectedType) === parseInt(type);
      };

      $scope.isCensored = function(message, privateWritingOn) {
        return message.creating && privateWritingOn;
      };

      $scope.updatePrivateWritingToggle = function(privateWritingOn) {
        $scope.boardRef.update({
          text_editing_is_private: privateWritingOn
        });
      };

      $scope.updateEditingMessage = function(message, value) {
        message.creating = value;
        $scope.messages.$save(message);
      };

      $scope.getSortFields = function() {
        return $scope.sortField === 'votes'
          ? ['-votes', 'date_created']
          : 'date_created';
      };

      $scope.saveMessage = function(message) {
        message.creating = false;
        $scope.messages.$save(message);
      };

      function redirectToBoard(board) {
        window.location.href = window.location.origin +window.location.pathname +'#' +board._id;
        $scope.loading = false;
      }

      $scope.isBoardNameInvalid = function() {
        return !$scope.newBoard.name;
      };

      $scope.isMaxVotesValid = function() {
        return Number.isInteger($scope.newBoard.max_votes);
      };

      $scope.createNewBoard = function() {
        $scope.loading = true;
        modalService.closeAll();
        boardService.create({
          boardName: $scope.newBoard.name,
          date_created: new Date().toString(),
          columns: $scope.messageTypes,
          user_id: utils.createUserId(),
          max_votes: $scope.newBoard.max_votes || 6,
          text_editing_is_private: $scope.newBoard.text_editing_is_private
        }).then(function(result){
          console.log(result);
          redirectToBoard(result);
        }).catch(function (error) {
          console.error(error)
        })
        $scope.newBoard.name = '';
      };

      $scope.changeBoardContext = function() {
        $scope.boardRef.update({
          boardContext: $scope.boardContext
        });
      };

      $scope.patchBoard = function(){
        boardService.patch($scope.board._id,{boardName:$scope.board.boardName}).then(function(data){
          $scope.board= data;
        }).catch(function (error) {
          console.error(error)
        })
        modalService.closeAll();
      }

      $scope.updateSortOrder = function() {
        var updatedFilter =
          $window.location.origin +
          $window.location.pathname +
          '?sort=' +
          $scope.sortField +
          $window.location.hash;
        $window.history.pushState({ path: updatedFilter }, '', updatedFilter);
      };

      $scope.addNewColumn = function(name) {
        if (!name) {
          return;
        }
        boardService.patch($scope.board._id,{
          $push: { columns: {
            value: name,
            id: utils.getNextId($scope.board)
          } }
        }).then(function(data){
          $scope.board= data;
          $scope.$apply();
        }).catch(function (error) {
          console.error(error)
        });

        modalService.closeAll();
      };

      $scope.changeColumnName = function(id, newName) {
        if (typeof newName === 'undefined' || newName === '') {
          return;
        }

        $scope.board.columns.map(function(column, index, array) {
          if (column.id === id) {
            array[index].value = newName;
          }
        });

        var boardColumns = firebaseService.getBoardColumns($scope.userId);
        boardColumns.set(utils.toObject($scope.board.columns));

        modalService.closeAll();
      };

      $scope.deleteColumn = function(column) {
        $scope.board.columns = $scope.board.columns.filter(function(_column) {
          return _column.id !== column.id;
        });
        boardService.patch($scope.board._id, {
          //$pop: { columns: 1 }
          $pull: { columns: {id:column.id} }
        }).then(function(data){
          $scope.board= data;
          $scope.$apply();
        }).catch(function (error) {
          console.error(error)
        });
        modalService.closeAll();
      };

      $scope.deleteMessage = function(message) {
        $scope.messages.$remove(message);

        modalService.closeAll();
      };

      function addMessageCallback(message) {
        var id = message.key;
        angular.element($('#' + id)).scope().isEditing = true;
        new EmojiPicker();
        $('#' + id)
          .find('textarea')
          .focus();
      }

      $scope.addNewMessage = function(type) {
        $scope.messages
          .$add({
            text: '',
            creating: true,
            user_id: $scope.userUid,
            type: {
              id: type.id
            },
            date: firebaseService.getServerTimestamp(),
            date_created: firebaseService.getServerTimestamp(),
            votes: 0
          })
          .then(addMessageCallback);
      };

      $scope.deleteCards = function() {
        $($scope.messages).each(function(index, message) {
          $scope.messages.$remove(message);
        });

        modalService.closeAll();
      };

      $scope.deleteBoard = function() {
        $scope.deleteCards();
        $scope.boardRef.ref.remove();

        modalService.closeAll();
        window.location.hash = '';
        location.reload();
      };

      $scope.submitOnEnter = function(event, method, data) {
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

      $scope.cleanImportData = function() {
        $scope.import.data = [];
        $scope.import.mapping = [];
        $scope.import.error = '';
      };

      /* globals Clipboard */
      new Clipboard('.import-btn');

      function reloadBoard(){
        $scope.loading = true;
        $scope.boardId = $window.location.hash.substring(1) || '';
        getBoardAndMessages($scope.boardId)
      }
      angular.element($window).bind('hashchange', reloadBoard);
      reloadBoard();
    }
  ]);
