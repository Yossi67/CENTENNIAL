/*
 * Copyright (c) 2016 highstreet technologies GmbH and others.  All rights reserved.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution,
 * and is available at http://www.eclipse.org/legal/epl-v10.html
 */

define(['app/mwtnLog/mwtnLog.module','app/mwtnCommons/mwtnCommons.services'],function(mwtnLogApp) {

  mwtnLogApp.register.factory('$mwtnLogView', function($http, $mwtnCommons, $mwtnLog, $mwtnDatabase) {
    
    var service = {};

    // console.log($mwtnCommons.tryModules(['ngRoute', 'ui.router']));

    service.getAllLogEntries = function(from, size, callback) {
      var sort = [ {
        timestamp : {
          order : 'desc'
        }
      }];
      $mwtnDatabase.getAllData('log', from, size, sort, function(logEntries){
        return callback(logEntries);
      });
    }

    service.deleteLogEntry = function(id, callback) {
      $mwtnDatabase.deleteDoc('log', id, function(deleted){
        return callback(deleted);
      });
    };
    return service;
  });
});
