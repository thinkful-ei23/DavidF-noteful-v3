/* global $ noteful api store */
'use strict';

$(document).ready(function() {
  const authToken = localStorage.getItem('authToken');
  store.currentUser = { authToken };
  if (authToken) {
    store.authorized = true;
    return Promise.all([
      api.search('/api/notes'),
      api.search('/api/folders'),
      api.search('/api/tags')
    ]).then(([notes, folders, tags]) => {
      store.notes = notes;
      store.folders = folders;
      store.tags = tags;
      noteful.render();
    });
  }

  noteful.bindEventListeners();

  // if (localStorage.getItem('authToken')) {
  //   store.authorized = true;
  //   store.authToken = localStorage.getItem('authToken');
  // }

  noteful.render();
});
