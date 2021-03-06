/*
* QuestionView
* License - http://github.com/adaptlearning/adapt_framework/LICENSE
* Maintainers - Daryl Hedley
*/

define(function(require) {

    var Handlebars = require('handlebars');
    var ComponentView = require('coreViews/componentView');
    var Adapt = require('coreJS/adapt');

    var QuestionView = ComponentView.extend({
    
        className: function() {
            return "component "
            + "question-component " 
            + this.model.get('_component')
            + "-component " + this.model.get('_id') 
            + " " + this.model.get('_classes')
            + " " + this.setVisibility()
            + " component-" + this.model.get('_layout')
            + " nth-child-" + this.options.nthChild;
        },
        
        preRender: function() {
            this.setupDefaultSettings();
            this.resetQuestion({resetAttempts:true, initialisingScreen:true});
            this.setupFeedbackArrays();
            this.listenTo(this.model, 'change:_isEnabled', this.onEnabledChanged);
        },
        
        isCorrect: function() {
            return !!Math.floor(this.model.get('_numberOfCorrectAnswers') / this.model.get('items').length);
        },
        
        isPartlyCorrect: function() {
            return !this.isCorrect() && this.model.get('_isAtLeastOneCorrectSelection');
        },
        
        getNumberOfCorrectAnswers: function() {
            var numberOfCorrectAnswers = 0;
            this.forEachAnswer(function(correct) {
                if(correct) numberOfCorrectAnswers++;
            });
            return numberOfCorrectAnswers;
        },
        
        getOptionSpecificFeedback: function() {
            // Check if option specific feedback has been set
            var selectedItem = this.getSelectedItems();
            if (selectedItem.hasOwnProperty('feedback')) {
                return selectedItem.feedback;
            } else {
                if (this.isCorrect()) {
                    return this.model.get('feedback').correct;
                } else if (this.isPartlyCorrect()) {
                    return this.model.get('feedback').partly;
                } else {
                    return this.model.get('feedback').incorrect;
                }
            }
        },
    
        getOptionSpecificAudio: function() {
            return this.getSelectedItems().audio;
        },
        
        getSelectedItems: function() {
            var selectedItems = this.model.get('_selectedItems');
            // if no second item exists, return just the first, else return the array
            return !selectedItems[1] ? selectedItems[0] : selectedItems;
        },
        
        markQuestion: function() {
            var correctCount = this.getNumberOfCorrectAnswers();
            var score = this.model.get("_questionWeight") * correctCount / this.model.get('items').length;

            this.model.set({
                "_numberOfCorrectAnswers": correctCount,
                "_score": score
            });
            this.isCorrect() ? this.onQuestionCorrect() : this.onQuestionIncorrect();
        },
        
        resetQuestion: function(properties) {
            if(!!properties.initialisingScreen && this.model.get('_isComplete')) {
                Adapt.trigger('questionView:reset', this);
            }
            this.model.set({"_isEnabled": this.model.get('_isComplete') ? this.model.get("_isEnabledOnRevisit") : true});
            
            if(this.model.get('_isEnabled')) {
                _.each(this.model.get('_selectedItems'), function(item) {item.selected = false}, this);
                this.model.set({
                    _isSubmitted: false,
                    _selectedItems: [],
                    _userAnswer: [],
                });
                if(properties.resetAttempts === true) this.model.set("_attemptsLeft", this.model.get('_attempts'));
                if(properties.resetCorrect === true) {
                    this.model.set({
                        _isCorrect: false,
                        _isAtLeastOneCorrectSelection: false
                    });
                }
            }
        },
        
        setupDefaultSettings: function() {
            if (!this.model.has("_questionWeight")) {
                this.model.set("_questionWeight", Adapt.config.get("_questionWeight"));
            }
            if (!this.model.has("buttons")) {
                this.model.set("buttons", Adapt.course.get("buttons"));
            } else {
                for(var key in this.model.get("buttons")) {
                    var value=this.model.get("buttons")[key];
                    if (!value) {
                        this.model.get("buttons")[key] = Adapt.course.get("buttons")[key];
                    }
                }
            }
        },

        setupFeedbackArrays: function() {
            // Randomize the selection of the feedback messages (if using an array)       
            if(!_.isString(this.model.get('feedback').partly)) {
                this.model.get('feedback').partly = this.model.get('feedback').partly[_.random(this.model.get('feedback').partly.length - 1)];
            } 

            if(!_.isString(this.model.get('feedback').incorrect)) {
                this.model.get('feedback').incorrect = this.model.get('feedback').incorrect[_.random(this.model.get('feedback').incorrect.length - 1)];
            }
        },
    
        showFeedback: function() {
            
            this.model.set('feedbackAudio', this.model.get("feedback").audio)
            
            if(this.model.get('_selectable') === 1) {
                if(this.getOptionSpecificFeedback()) {
                    this.model.set('feedbackMessage', this.getOptionSpecificFeedback());
                }
                if(this.getOptionSpecificAudio()) {
                    this.model.set('feedbackAudio', this.getOptionSpecificAudio());
                }
            }

            Adapt.mediator.defaultCallback('questionView:feedback', function(feedback) {
                Adapt.trigger('questionView:showFeedback', feedback);
            });

            Adapt.trigger('questionView:feedback', {
                title: this.model.get('title'),
                message:this.model.get('feedbackMessage'),
                audio:this.model.get('feedbackAudio')
            });

        },
        
        showMarking: function() {
            _.each(this.model.get('items'), function(item, i) {
                var $item = this.$('.item').eq(i);
                $item.addClass(item.correct ? 'correct' : 'incorrect');
            }, this);
        },
        
        showModelAnswer: function () {
            this.$(".component-widget").removeClass("user").addClass("model");
            this.onModelAnswerShown();
        },
        
        showUserAnswer: function() {
            this.$(".component-widget").removeClass("model").addClass("user");
            this.onUserAnswerShown();
        },
        
        onComplete: function(parameters) {
            this.model.set({
                _isComplete: true,
                _isEnabled: false,
                _isCorrect: !!parameters.correct
            });
            this.$(".component-widget").addClass("disabled");
            if(parameters.correct) this.$(".component-widget").addClass("correct");
            this.showMarking();
            this.showUserAnswer();
            Adapt.trigger('questionView:complete', this);
        },
    
        onModelAnswerClicked: function(event) {
            if(event) event.preventDefault();
            this.showModelAnswer();
        },
        
        onQuestionCorrect: function() {
            this.onComplete({correct: true});
            this.model.getParent("article").attributes.score ++;
            this.model.set("feedbackMessage", this.model.get("feedback").correct);
        },
        
        onQuestionIncorrect: function() {
            if (this.isPartlyCorrect()) {
                if (!_.isString(this.model.get('feedback').partly)) {
                    this.model.get('feedback').partly = this.model.get('feedback').partly[_.random(this.model.get('feedback').partly.length - 1)];
                } else {
                    this.model.set("feedbackMessage", this.model.get('feedback').partly); 
                }
            } else {
                if (!_.isString(this.model.get('feedback').incorrect)) {
                    this.model.get('feedback').partly = this.model.get('feedback').incorrect[_.random(this.model.get('feedback').incorrect.length - 1)];
                } else {
                    this.model.set("feedbackMessage", this.model.get('feedback').incorrect); 
                }
            }

            if (Math.ceil(this.model.get("_attemptsLeft")/this.model.get("_attempts")) === 0) {
                this.onComplete({correct: false});
            }
        },
        
        onResetClicked: function(event) {
            if(event) event.preventDefault(); 
            this.resetQuestion({resetAttempts:false, resetCorrect:true});
            this.$(".component-widget").removeClass("submitted");
            this.resetItems();
        },
    
        onSubmitClicked: function(event) {
            event.preventDefault();
            
            if(!this.canSubmit()) return;
            
            Adapt.tabHistory = $(event.currentTarget).parent('.inner');
            
            var attemptsLeft = this.model.get("_attemptsLeft") - 1;
            this.model.set({
                _isEnabled: false,
                _isSubmitted: true,
                _attemptsLeft: attemptsLeft
            });
            this.$(".component-widget").addClass("submitted");
            
            this.storeUserAnswer();
            this.markQuestion();
            this.showFeedback();
        },
    
        onUserAnswerClicked: function(event) {
            if(event) event.preventDefault();
            this.showUserAnswer();
        },

        onEnabledChanged: function () {},

        postRender: function() {
            ComponentView.prototype.postRender.apply(this);
            if(this.model.get('_isEnabled') == false) {
                this.showUserAnswer();
            }
        },
        
        /**
        * to be implemented by subclass
        */
        // compulsory methods
        canSubmit: function() {},
        forEachAnswer: function() {},
        // optional methods
        resetItems: function(){},
        onModelAnswerShown: function() {},
        onUserAnswerShown: function() {},
        storeUserAnswer: function() {}
        
    });
    
    return QuestionView;

});