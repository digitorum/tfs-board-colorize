define(["require", "WorkItemTracking/Scripts/TFS.WorkItemTracking", "Agile/Scripts/TFS.Agile.TaskBoard.View"], function (require, WorkItemTracking, AgileTaskBoardView) {

    //#region CssSpawner

    /**
     * "Спавнер" таблицы стилей
     */
    function CssSpawner() {
        this.sheet = (function () {
            var style = document.createElement("style");
            try {
                style.appendChild(document.createTextNode(""));
            } catch (e) { }
            document.getElementsByTagName("head")[0].appendChild(style);
            return style.sheet || style.styleSheet;
        })();
    }

    /**
     * Ссылка на таблцу стилей
     * @var {object}
     */
    CssSpawner.prototype.sheet = null;

    /**
     * Добавить правило
     * @param {object} sheet - ссылка на <style>[sheet || styleSheet]
     * @param {string} selector
     * @param {string} rules
     * @param {int} index
     */
    CssSpawner.prototype.addCSSRule = function (selector, rules, index) {
        if ("insertRule" in this.sheet) {
            this.sheet.insertRule(selector + "{" + rules + "}", index);
        } else if ("addRule" in this.sheet) {
            this.sheet.addRule(selector, rules, index);
        }
    }

    /**
     * Обновить правило
     * @param {object} sheet - ссылка на <style>[sheet || styleSheet]
     * @param {string} selector
     * @param {string} rules
     */
    CssSpawner.prototype.updateCSSRule = function (selector, rules) {
        var cssrules;

        if ("cssRules" in this.sheet) {
            cssrules = this.sheet.cssRules;
        } else {
            cssrules = this.sheet.rules;
        }
        for (var i = 0; i < cssrules.length; i++) {
            if (cssrules[i] && cssrules[i].selectorText && cssrules[i].selectorText == selector) {
                this.sheet.deleteRule(i);
                break;
            }
        }
        this.addCSSRule(selector, rules, 0); // не нашли - добавляем
    }
    

    //#endregion

    /**
     * Воркайтем мэнежджер
     * Нужен для загрузки айтемов и прослушки событий
     * @var {object}
     */
    var workItemManager = TFS.OM.Common.ProjectCollection.getDefaultConnection().getService(TFS.WorkItemTracking.WorkItemStore).workItemManager;

    //#region WorkItem

    /**
    * Воркайтем
    * @var {function}
    */
    var WorkItem = (function () {

        /**
         * Воркайтем
         * @param {object} data
         */
        function WorkItem(data) {
            this.data = data;
            this.color = "";
            this.dom = WorkItem.getTiles(this.data["System.Id"]);
            WorkItem.instances[this.data["System.Id"]] = this;
        }
        
        /**
         * Ссылка на дом
         * @var {object}
         */
        WorkItem.prototype.data = null;

        /**
         * Данные воркайтема
         * @var {object}
         */
        WorkItem.prototype.data = null;

        /**
         * Текущий цвет плитки
         * @var {string}
         */
        WorkItem.prototype.color = null;
        
        /**
         * Перекрасить плитку, если цвет на совпадают
         */
        WorkItem.prototype.recolorize = function () {
            if (this.dom.find('.tbTileContent').css('background-color') != this.color) { 
                this.colorize();
            }
        }

        /**
         * Раскрасить плитку
         */
        WorkItem.prototype.colorize = function () {
            var that = this;
            
            this.color = (function () {
                if (that.data["System.WorkItemType"] == 'Task') {
                    switch (that.data["Microsoft.VSTS.Common.Priority"]) {
                        case 1:
                            return 'rgb(249, 240, 114)';
                            break;
                        case 2:
                            return 'rgb(255, 253, 196)';
                            break;
                        case 3:
                            return 'rgb(255, 254, 233)';
                            break;
                        case 4:
                            return 'rgb(247, 247, 247)';
                            break;
                    }
                } else if (that.data["System.WorkItemType"] == 'Bug') {
                    switch (that.data["Microsoft.VSTS.Common.Priority"]) {
                        case 1:
                            return 'rgb(249, 176, 152)';
                            break;
                        case 2:
                            return 'rgb(254, 219, 208)';
                            break;
                        case 3:
                            return 'rgb(254, 242, 239)';
                            break;
                        case 4:
                            return 'rgb(247, 247, 247)';
                            break;
                    }
                }
            })();
            this.dom.find('.tbTileContent').css('background-color', this.color);
            this.color = this.dom.find('.tbTileContent').css('background-color'); // обновляем, что бы браузер не путался
        }
        
        /**
         * Поля воркайтема, необходимые для загрузки
         * @var {array}
         */
        WorkItem.fields = ["System.Id", "System.WorkItemType", "Microsoft.VSTS.Common.Priority"];
        
        /**
         * Получить ссылку на плитку
         * @param {int|undefined} id
         * @return {object}
         */
        WorkItem.getTiles = function (id) {
            if (!id) {
                return $('.tbTile');
            }
            return $('#tile-' + id);
        }
        
        /**
         * Получить список ID рабочих элементов на борде
         * @return {array}
         */
        WorkItem.getIdsList = function () {
            var ids = [];
            
            this.getTiles().each(function () {
                var id = parseInt($(this).find('[field="System.Id"]').text(), 10);
                
                if (!id) {
                    return;
                }
                ids.push(id);
            });
            return ids;
        }
        
        /**
         * Загрузить данные воркайтемов
         * @param {array} ids
         * @param {function} payload
         */
        WorkItem.load = function (ids, payload) {
            if (ids.length) {
                var ccount = Math.ceil(ids.length / 100), chunks = [];

                for (var i = 0; i < ccount; ++i) {
                    var f = i * 100, l = f + 100;

                    if (l >= ids.length) {
                        l = ids.length;
                    }
                    workItemManager.store.beginPageWorkItems(ids.slice(f, l), WorkItem.fields, payload);
                }
            }
        }
        
        /**
         * Список созданных ранее воркайтемов
         * @var {object}
         */
        WorkItem.instances = {}
        
        /* Создать инстанс воркайтема
         * @ param { array | object } fields 
         * @ param { array } row
         */
        WorkItem.getIntance = function (fields, row) {
            var data = {};

            if (fields.length) {
                // передано соотвествтие `массив полей` => `массив значений`
                for (var i = 0; i < fields.length; ++i) {
                    data[fields[i]] = row[i];
                }
            } else if (fields.store) {
                // передан воркайтем из события
                for (var fieldName in fields.fieldMap) {
                    var field = fields.fieldMap[fieldName];
                    
                    if ($.inArray(field.fieldDefinition.referenceName, WorkItem.fields) !== -1) {
                        data[field.fieldDefinition.referenceName] = fields.fieldData[field.fieldDefinition.id];
                    }
                }
            }
            if (WorkItem.instances[data["System.Id"]]) {
                return WorkItem.instances[data["System.Id"]];
            }
            return new WorkItem(data);
        }

        return WorkItem;

    })();

    //#endregion

    // загружаем данные по всем ворайтемам
    WorkItem.load(WorkItem.getIdsList(), function (payload) {
        for (var i = 0; i < payload.rows.length; ++i) {
            (WorkItem.getIntance(payload.columns, payload.rows[i])).colorize();
        }
    });

    // слушаем события
    workItemManager.attachWorkItemChanged(function (sender, workItemChangedArgs) {
        if (!workItemChangedArgs.change || $.inArray(workItemChangedArgs.change, ['save-completed', 'reset']) == -1) {
            // reset - закрытие окна
            // save-completed - сохранение айтема (выбрасывается так же при нажатии кнопки "сохранить и закрыть")
            return;
        }
        // обновляем данные на плитке
        window.setTimeout(function () {
            WorkItem.load([workItemChangedArgs.workItem.id], function (payload) {
                (WorkItem.getIntance(workItemChangedArgs.workItem)).colorize();
            })
        }, 100);
        return false;
    });

    // перекраска инстансов, если это надо
    // через интервал в виду того, что RESET больше не отслеживанися
    setInterval(function () {
        for (var id in WorkItem.instances) { 
            WorkItem.instances[id].recolorize();
        }
    }, 400);

    // обвовляем AgileTaskBoardView для компановки плиток
    // действия выполняем в самом конце и в отрыве от контекста
    setTimeout(function () {
        var cssSpawner = null, cacheWidth = 0, view = AgileTaskBoardView.TaskBoardView;

        if (!(AgileTaskBoardView && AgileTaskBoardView.TaskBoardView)) {
            return;
        }

        function getWidth() {
            var cell = $('.' + view.CELL_CLASS + '.ui-droppable:visible:first');

            view.TILE_WIDTH = cell.length ? (cell.innerWidth() / 2 - (view.CELL_PADDING + view.TILE_MARGIN) * 3) : 155;
            if (view.TILE_WIDTH > 185) {
                view.TILE_WIDTH = 185;
            }
            return view.TILE_WIDTH;
        }

        cssSpawner = new CssSpawner();

        setInterval(function () {
            var width = getWidth();

            if (width != cacheWidth) {
                cacheWidth = width;
                cssSpawner.updateCSSRule('.tbTile', 'width: {0}px !important;'.replace('{0}', AgileTaskBoardView.TaskBoardView.TILE_WIDTH));
                // рассчет количества субколонок в AgileTaskBoardView.TaskBoardView.prototype._calculateColumnSizeForCustomLayout
                // перерисовка борды через AgileTaskBoardView.TaskBoardView.prototype._relayout, который вешается на resize окна
                $(window).trigger('resize'); // window.dispatchEvent(new Event('resize')); // другим способом _relayout не вызвать
            }
        }, 200); // проверяем размеры 5 раз в секунду

    }, 0);
});