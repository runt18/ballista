// Copyright 2015 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Foreground page
"use strict";

// Returns the URLs of the selected rows.
function selectedUrls() {
  var urls = [];
  var trs = document.querySelectorAll('#handler_table tbody tr');
  for (var i = 0; i < trs.length; i++) {
    var tr = trs[i];
    if (tr.querySelector('input').checked) {
      var urlCell = tr.querySelectorAll('td')[2];
      urls.push(urlCell.textContent);
    }
  }
  return urls;
}

function selectionChanged() {
  var selected = selectedUrls().length > 0;
  var deleteButton = document.getElementById('delete_handlers');
  if (selected)
    deleteButton.removeAttribute('disabled');
  else
    deleteButton.setAttribute('disabled', '');
}

function generateTableRows() {
  var table = document.getElementById('handler_table');
  var tbody = table.querySelector('tbody');
  while (tbody.firstChild)
    tbody.removeChild(tbody.firstChild);

  openRegistryDatabase().then(db => {
    db.getAllHandlers().then(handlers => {
      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        var cells = [handler.name, handler.url, handler.verbs.join(', ')];
        var tr = createTableRow(cells);
        tbody.appendChild(tr);
      }
      db.close();
      reUpgradeTable(table, selectionChanged);
    }, () => db.close());
  });
}

function deleteHandlersClick() {
  openRegistryDatabase().then(db => {
    db.deleteHandlerForUrls(selectedUrls())
        .then(() => db.close(), () => db.close());
    generateTableRows();
  });
}

function setNewHandlerError(message) {
  var p = document.getElementById('new_handler_error');
  while (p.firstChild)
    p.removeChild(p.firstChild);
  p.appendChild(document.createTextNode(message));
}

function setTextField(textfield, value) {
  textfield.parentNode.MaterialTextfield.change(value);
}

function newHandlerClick() {
  var name = document.getElementById('new_handler_name');
  var url = document.getElementById('new_handler_url');
  var verbs = document.getElementById('new_handler_verbs');

  var nameStr = name.value.trim();
  var urlStr = url.value.trim();
  var verbList = verbs.value.split(',').map(s => s.trim());
  verbList = verbList.filter(s => s != '');

  var missingFields = [];
  if (!nameStr)
    missingFields.push('Name');
  if (!urlStr)
    missingFields.push('URL');
  if (verbList.length == 0)
    missingFields.push('Verbs');

  if (missingFields.length > 0) {
    setNewHandlerError('Error: Missing required fields: ' +
                       missingFields.join(', '));
    return;
  }

  var handler = new Handler(nameStr, urlStr, verbList);

  openRegistryDatabase().then(db => {
    db.registerHandler(handler)
        .then(
            () => {
              db.close();
              setTextField(name, '');
              setTextField(url, '');
              setTextField(verbs, '');
              setNewHandlerError('');
            },
            e => {
              db.close();
              var message = e.message;
              if (e.name == 'ConstraintError')
                message = 'A handler with that URL already exists.';
              setNewHandlerError('Error: ' + message);
            });
    generateTableRows();
  });
}

function onLoad() {
  document.getElementById('delete_handlers')
      .addEventListener('click', deleteHandlersClick);
  document.getElementById('new_handler')
      .addEventListener('click', newHandlerClick);
  generateTableRows();
}

window.addEventListener('load', onLoad, false);
