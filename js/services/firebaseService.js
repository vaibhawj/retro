'use strict';

angular
  .module('fireideaz')
  .service('FirebaseService', ['$feathers','firebase', '$firebaseArray', '$firebaseObject', function ($feathers,firebase, $firebaseArray, $firebaseObject) {
    var message = $feathers.service('message')
    var board = $feathers.service('board')
    function newFirebaseArray(messagesRef) {
      return $firebaseArray(messagesRef);
    }

    function getServerTimestamp() {
      return new Date().getTime();
      //return firebase.database.ServerValue.TIMESTAMP;
    }

    function getMessagesRef(userId) {
      return message.find({query: {userId: userId}});
      //return firebase.database().ref('/messages/' + userId);
    }

    function getMessageRef(userId, messageId) {
      return message.get({query: {userId: userId,messageId:messageId}});
      //return firebase.database().ref('/messages/' + userId + '/' + messageId);
    }

    function getBoardRef(userId) {
      return board.find({query: {userId: userId}});
      //return firebase.database().ref('/boards/' + userId);
    }

    function getBoardObjectRef(userId) {
      return board.find({query: {userId: userId}});
      //return $firebaseObject(firebase.database().ref('/boards/' + userId));
    }

    function getBoardColumns(userId) {
      return board.find({query: {userId: userId}});
      //return firebase.database().ref('/boards/' + userId + '/columns');
    }

    return {
      // newFirebaseArray: newFirebaseArray,
      getServerTimestamp: getServerTimestamp,
      getMessagesRef: getMessagesRef,
      getMessageRef: getMessageRef,
      getBoardRef: getBoardRef,
      getBoardObjectRef: getBoardObjectRef,
      getBoardColumns: getBoardColumns
    };
  }]);
