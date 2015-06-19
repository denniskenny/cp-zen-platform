 'use strict';

function cdDojoEventsListCtrl($scope, $modal, $state, $location, $translate, cdEventsService, tableUtils, alertService, auth) {
  var dojoId = $scope.dojoId;
  $scope.filter = {dojo_id:dojoId};
  $scope.itemsPerPage = 10;
  var currentUser;

  auth.get_loggedin_user(function (user) {
    currentUser = user;
  });

  $scope.pageChanged = function () {
    $scope.loadPage($scope.filter, false);
  };

  $scope.loadPage = function (filter, resetFlag, cb) {
    cb = cb || function () {};
    //Only list events for this Dojo
    var dojoQuery = { query: { match: { dojo_id: dojoId }}};
    $scope.sort = $scope.sort ? $scope.sort :[{ date: 'asc' }];

    var query = _.omit({
      dojo_id: filter.dojo_id,
    }, function (value) { return value === '' || _.isNull(value) || _.isUndefined(value) });

    var loadPageData = tableUtils.loadPage(resetFlag, $scope.itemsPerPage, $scope.pageNo, query);
    $scope.pageNo = loadPageData.pageNo;
    $scope.events = [];

    var meta = {
      sort: $scope.sort,
      from: loadPageData.skip,
      size: $scope.itemsPerPage
    };

    dojoQuery = _.extend(dojoQuery, meta);
    
    cdEventsService.search(dojoQuery).then(function (result) {
      var events = [];
      _.each(result.hits, function (event) {
        var event = event._source;
        event.date = moment(event.date).format('MMMM Do YYYY, h:mm');
        var userTypes = event.userTypes;
        if(_.contains(userTypes, 'attendee-u13') && _.contains(userTypes, 'attendee-o13')) {
          event.for = $translate.instant('All');
        } else if(_.contains(userTypes, 'attendee-u13')) {
          event.for = '< 13';
        } else {
          event.for = '> 13';
        }
        events.push(event);
      });
      $scope.events = events;
      $scope.totalItems = result.total;
      return cb();
    });
  }

  $scope.loadPage($scope.filter, true);

  $scope.applyForEvent = function (event) {
    if(!_.isEmpty(currentUser)) {
      var modalInstance = $modal.open({
        animation: true,
        templateUrl: '/dojos/template/events/apply',
        controller: 'apply-for-event-controller',
        size: 'lg',
        resolve: {
          eventData: function () {
            return event;
          }
        }
      });

      modalInstance.result.then(function (status) {
        if(status === 'success') {
          alertService.showAlert($translate.instant('Thank You. Your application has been received. You will be notified by email if you are approved for this event.'));
        } else {
          alertService.showError($translate.instant('Error applying for event') + status);
        }
      });
    } else {
      $state.go('register-account', {referer:$location.url()});
    }
    
  }

  $scope.toggleSort = function ($event, columnName) {
    var className, descFlag, sortConfig = {},sort = [], currentTargetEl;
    
    var DOWN = 'glyphicon-chevron-down';
    var UP = 'glyphicon-chevron-up';
    var ACTIVE_COL = 'green-text';
    var ACTIVE_COL_CLASS = ".green-text";

    function isDesc(className) {
      var result = className.indexOf(DOWN);

      return result > -1 ? true : false;
    }

    currentTargetEl = angular.element($event.currentTarget);

    className = $event.currentTarget.className;

    angular.element(ACTIVE_COL_CLASS).removeClass(ACTIVE_COL);

    descFlag = isDesc(className);

    if (descFlag) {
      sortConfig[columnName] = {order: "asc"};
      sort.push(sortConfig);

      currentTargetEl
        .removeClass(DOWN)
        .addClass(UP);
    } else {
      sortConfig[columnName] = {order: "desc"};
      sort.push(sortConfig);
      currentTargetEl
        .removeClass(UP)
        .addClass(DOWN);
    }

    currentTargetEl.addClass(ACTIVE_COL);

    angular.element("span.sortable")
      .not(ACTIVE_COL_CLASS)
      .removeClass(UP)
      .addClass(DOWN);

    $scope.sort = sort;
    $scope.loadPage($scope.filter, true);
  }

}

angular.module('cpZenPlatform')
    .controller('dojo-events-list-controller', ['$scope', '$modal', '$state', '$location', '$translate', 'cdEventsService', 'tableUtils', 'alertService', 'auth', cdDojoEventsListCtrl]);
