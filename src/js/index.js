// Global app controller
import Search from './models/Search';
import Recipe from './models/Recipe';
import List from './models/List';
import Like from './models/Like';
import LikesList from './models/LikesList';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from './views/base';
/* 
* Global state of the app
* - Search object
* - Current recipe object
* - Shopping list object
* - Liked recipes
*/
const state = {};

/*
* Search controller
*/
const controlSearch = async () => {
    // 1) Get the query from the view
    const query = searchView.getInput();

    if (query) {
        // 2) New search object created and added to state
        state.search = new Search(query);

        // 3) Prepare the UI for results
        searchView.clearResults();
        renderLoader(elements.searchResults);

        try {
            // 4) Search for recipes
            await state.search.getResultsAsync();

            // 5) Render results in the UI
            Promise.resolve('Success').then(() => {
                searchView.clearInput();
                clearLoader();
            })

            searchView.renderResults(state.search.recipes);
        }
        catch (error) {
            alert('Load failed - please wait a few moments and try again.');
            clearLoader();
        }

    }
}

/*
* Recipe controller
*/

const controlRecipe = async () => {
    const id = window.location.hash.replace('#', '');

    if (id) {
        // Prepare UI for changes
        recipeView.clearResults();
        renderLoader(elements.recipe);

        // Highlight the selected recipe item
        if (state.search) {
            searchView.highlightSelected(id);
        }

        // Create new recipe object
        state.recipe = new Recipe(id);

        try {
            // Get recipe data
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();
            // Call recipe-specific functions
            state.recipe.calculateTime();
            state.recipe.calculateServings();
            // Render recipe
            clearLoader();
            recipeView.renderRecipe(state.recipe, state.likes.isLiked(id));
            document.title = `forkify // ${state.recipe.title}`;
        }
        catch (error) {
            console.log(error);
            alert('Load failed - please wait a few moments and try again.');
        }
    }
}

/*
* List controller
*/
const controlList = () => {
    // Initialise the list if it doesn't exist yet
    if (!state.list) state.list = new List();

    // Add each ingredient to the list
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
}

/*
* Likes controller
*/
const controlLike = () => {
    if (!state.likes) state.likes = new LikesList();

    const currentID = state.recipe.id;
    if (!state.likes.isLiked(currentID)) {
        // Add the like to the state
        const newLike = new Like(state.recipe.id, state.recipe.title, state.recipe.publisher, state.recipe.img);
        state.likes.add(newLike);
        // Toggle the like button on
        likesView.toggleLikeButton(true);
        // Add like to the UI 
        console.log(`New like added: ${state.likes}`);
        likesView.renderLike(newLike);
    }
    else {
        // Remove like from the state
        state.likes.delete(currentID);
        // Toggle the like button off
        likesView.toggleLikeButton(false);
        // Remove like from the UI
        console.log(`Like removed: ${state.likes}`);
        likesView.deleteLike(currentID);
    }

    likesView.toggleLikesMenu(state.likes.length);
}

// Condense adding multiple events to a single event listener
['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

window.addEventListener('load', () => {
    // Read likes from local storage
    state.likes = new LikesList();
    state.likes.readStorage();

    // Toggle the likes menu icon on if there is at least one like
    likesView.toggleLikesMenu(state.likes.length);

    // Render the existing likes
    state.likes.forEach(like => {
        likesView.renderLike(like);
    });
});

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResultPages.addEventListener('click', event => {
    const btn = event.target.closest('.btn-inline');
    
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);

        searchView.clearResults();
        searchView.renderResults(state.search.recipes, goToPage);
    }
});

elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button has been clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingAmounts(state.recipe);
        }
    }
    else if (e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button has been clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingAmounts(state.recipe);
    }
    else if (e.target.matches(`.recipe__btn--add, .recipe__btn--add *`)) {
        if (state.list) state.list.empty();
        listView.clearItems();
        controlList();
    }
    else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Call the likes controller
        controlLike();
    }
});

elements.shopping.addEventListener('click', e => {
    // Find the id from the 'data' attribute of the element
    const id = e.target.closest('.shopping__item').dataset.itemid;
    
    // Handle the delete button click event
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state list
        state.list.deleteItem(id);
        // Delete from the list in the UI
        listView.deleteItem(id);
    }
    // Handle the 'update count' event - 
    else if (e.target.matches('.shopping__count--value')) {
        // If the input is below the minimum amount, set the count in the state list to that minimum amount.
        if (e.target.value >= e.target.step) {
            const val = parseFloat(e.target.value, 10);
            state.list.updateCount(id, val);
        }
        else {
            e.target.value = e.target.step;
        }
    }
});
