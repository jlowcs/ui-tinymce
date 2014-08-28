/**
 * Binds a TinyMCE widget to <textarea> elements.
 */
angular.module('ui.tinymce', [])
  .value('uiTinymceConfig', {})
  .directive('uiTinymce', ['uiTinymceConfig', function (uiTinymceConfig) {
    uiTinymceConfig = uiTinymceConfig || {};
    var generatedIds = 0;
    return {
      priority: 10,
      require: 'ngModel',
      link: function (scope, elm, attrs, ngModel) {
        var getPlaceholderText = function() {
          return expression.placeholder ? "<span class='ui-tinymce-placeholder'>"+expression.placeholder+"</span>" : '';
        };
        //whether the placeholder is displayed
        var isPlaceholderVisible = false;
        //used to ignore setContent event and therefore not set the ngmodel value
        var ignoreSetContent = false;
        //whether the field has focus
        var focused = false;

        var expression, options, tinyInstance,
          updateView = function () {
            ngModel.$setViewValue(isPlaceholderVisible ? '' : elm.val());
            if (!scope.$root.$$phase) {
              scope.$apply();
            }
          };

        // generate an ID if not present
        if (!attrs.id) {
          attrs.$set('id', 'uiTinymce' + generatedIds++);
        }

        if (attrs.uiTinymce) {
          expression = scope.$eval(attrs.uiTinymce);
        } else {
          expression = {};
        }

        // make config'ed setup method available
        if (expression.setup) {
          var configSetup = expression.setup;
          delete expression.setup;
        }

        options = {
          // Update model when calling setContent (such as from the source editor popup)
          setup: function (ed) {
            var args;
            var setPlaceHolder = function(force) {
                if (!force && (isPlaceholderVisible || !expression.placeholder)) {
                    return ;
                }
                isPlaceholderVisible = true;
                ignoreSetContent = true;
                ed.setContent(getPlaceholderText());
                ignoreSetContent = false;
            };
            var clearPlaceHolder = function() {
                if (!isPlaceholderVisible) {
                    return ;
                }
                isPlaceholderVisible = false;
                ignoreSetContent = true;
                ed.setContent('');
                ignoreSetContent = false;
            };
            var getContent = function() {
                return isPlaceholderVisible ? '' : ed.getContent();
            };

            ed.on('init', function(args) {
              ngModel.$render();
              ngModel.$setPristine();

              // If content is empty and we have a placeholder set the placeholder
              if (!focused && !getContent().length) {
                setPlaceHolder();
              }
            });
            // Update model on button click
            ed.on('ExecCommand', function (e) {
              if (!e.initial && (e.command !== "mceRepaint") && (ngModel.$viewValue || '') !== (getContent() || '')) {
                ed.save();
                updateView();
              }
            });
            // Update model on keypress
            ed.on('KeyUp', function (e) {
              if (!e.initial && (ngModel.$viewValue || '') !== (getContent() || '')) {
                ed.save();
                updateView();
              }
            });
            // Update model on change, i.e. copy/pasted text, plugins altering content
            ed.on('SetContent', function (e) {
              if (!ignoreSetContent) {
                //if the field is not focused, and the content is empty, set the placeholder
                if (!isPlaceholderVisible && !focused && !getContent().length) {
                  setPlaceHolder();
                }

                if (!e.initial && (ngModel.$viewValue || '') !== (getContent() || '')) {
                  ed.save();
                  updateView();
                }
              }
            });
            ed.on('focus', function() {
              // replace the default content on focus if the same as original placeholder
              if (isPlaceholderVisible) {
                clearPlaceHolder();
              }
              focused = true;
            });
            ed.on('blur', function(e) {
              if (!getContent().length) {
                setPlaceHolder();
              }
              focused = false;

              elm.blur();
            });
            // Update model when an object has been resized (table, image)
            ed.on('ObjectResized', function (e) {
              if (!e.initial && (ngModel.$viewValue || '') !== (getContent() || '')) {
                ed.save();
                updateView();
              }
            });
            if (configSetup) {
              configSetup(ed);
            }

            scope.$watch(function() {
              return expression.placeholder;
            }, function() {
              if (isPlaceholderVisible) {
                if (expression.placeholder) {
                  setPlaceHolder(true);
                } else {
                  clearPlaceHolder();
                }
              }
            });
          },
          mode: 'exact',
          elements: attrs.id
        };
        // extend options with initial uiTinymceConfig and options from directive attribute value
        angular.extend(options, uiTinymceConfig, expression);
        setTimeout(function () {
          tinymce.init(options);
        });

        ngModel.$render = function() {
          if (!tinyInstance) {
            tinyInstance = tinymce.get(attrs.id);
          }
          if (tinyInstance) {
            ignoreSetContent = true;
            if (!ngModel.$viewValue) {
              tinyInstance.setContent(getPlaceholderText());
              isPlaceholderVisible = true;
            } else {
              tinyInstance.setContent(ngModel.$viewValue);
              isPlaceholderVisible = false;
            }
            ignoreSetContent = false;
          }
        };

        scope.$on('$destroy', function() {
          if (!tinyInstance) { tinyInstance = tinymce.get(attrs.id); }
          if (tinyInstance) {
            tinyInstance.remove();
            tinyInstance = null;
          }
        });
      }
    };
  }]);
