/*
* Adapt
* License - http://github.com/adaptlearning/adapt_framework/LICENSE
* Maintainers - Daryl Hedley, Fabien O'Carroll
*/

define(function(require){

    var _ = require('underscore');
    var Backbone = require('backbone');
    
    var Adapt = {};

    _.extend(Adapt, Backbone.Events);
    
    Adapt.initialize = _.once(function() {
        Adapt.trigger('adapt:initialize');
        Backbone.history.start();
    });
    
    Adapt.componentStore = {};
    
    Adapt.register = function(name, object) {
        
        if (Adapt.componentStore[name])
            throw Error('This component already exists in your project');
        object.template = name;
        Adapt.componentStore[name] = object;     
        
    }
    
    return Adapt;
    
});
