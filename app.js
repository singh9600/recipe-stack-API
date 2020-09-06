const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const axios = require("axios");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static("public"));

mongoose.connect(`mongodb+srv://admin-harpreet:${process.env.MONGODB_PASS}@cluster0.yzzoo.mongodb.net/recipeDB`, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const ingredientSchema = {
    username: String,
    name: String
};

const recipeSchema = {
    username: String,
    recipeID: String
};

const userSchema = {
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    }
};

const Ingredient = mongoose.model("Ingredient", ingredientSchema);
const Recipe = mongoose.model("Recipe", recipeSchema);
const User = mongoose.model("User", userSchema);

//------------User Authentication------------
app.route("/user/login")
    .post(async function(req, res) {
        User.findOne(
            {
                username: req.body.username,
            },
            async function(err, foundUser) {
                if(foundUser) {
                    if(await bcrypt.compare(req.body.password ,foundUser.password)) {
                        jwt.sign({user: foundUser}, process.env.JWT_KEY, function(err, token) {
                            res.json({
                                token: token
                            });
                        });
                    } else {
                        res.send("Wrong username or password");
                    }
                } else {
                    res.send("Wrong username or password");
                }
            }
        );
    });

app.route("/user/signup")
    .post(async function(req, res) {
        try {
            const salt = await bcrypt.genSalt();
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            const newUser = new User({
                username: req.body.username,
                password: hashedPassword
            });
            newUser.save(function(err) {
                if(!err) {
                    res.send("Successfully added the user");
                } else {
                    res.send(err);
                }
            });
        } catch {
            res.status(500).send();
        }
    });
//------------Get Recipe from Spoonacular------------
app.route("/spoonacularRecipe")
    .get(function(req, res) {
        const ingredientStr = req.body.ingredientStr;
        const apiKey = process.env.API_KEY;
        axios.get(`https://api.spoonacular.com/recipes/random?apiKey=${apiKey}&ingredients=${ingredientStr}&number=1`)
            .then(function (response) {
                res.send(response.data);
            })
            .catch(function(err) {
                res.send(err);
            });
    });
//------------Recipe Routes------------
app.route("/recipies")
    .get(verifyToken, function(req, res) {
        jwt.verify(req.token, process.env.JWT_KEY, function(err, authData) {
            if(err) {
                res.sendStatus(403);
            } else {
                Recipe.find(function(err, foundRecipes) {
                    if(foundRecipes) {
                        res.send(foundRecipes);
                    } else {
                        res.send("No Recipes");
                    }
                });
            }
        });   
    })
    .post(verifyToken, function(req, res) {
        jwt.verify(req.token, process.env.JWT_KEY, function(err, authData) {
            if(err) {
                res.sendStatus(403);
            } else {
                const newRecipe = new Recipe({
                    username: req.body.username,
                    recipeID: req.body.name
                });
                newRecipe.save(function(err) {
                    if(!err) {
                        res.send("Successfully added the recipe");
                    } else {
                        res.send(err);
                    }
                });
            }
        }); 
    });

//------------Ingredient Routes------------
app.route("/ingredients")
    .get(verifyToken, function(req, res) {
        jwt.verify(req.token, process.env.JWT_KEY, function(err, authData) {
            if(err) {
                res.sendStatus(403);
            } else {
                Ingredient.findOne(
                    {
                        username: req.body.username,
                        name: req.body.name
                    },
                    function(err, foundIngredients) {
                        if(foundIngredients) {
                            res.send(foundIngredients);
                        } else {
                            res.send("No Ingredients");
                        }
                    }
                );
            }
        }); 
    })
    .post(verifyToken, function(req, res) {
        jwt.verify(req.token, process.env.JWT_KEY, function(err, authData) {
            if(err) {
                res.sendStatus(403);
            } else {
                const newIngredient = new Ingredient({
                    username: req.body.username,
                    name: req.body.name
                });
                newIngredient.save(function(err) {
                    if(!err) {
                        res.send("Successfully added the ingredients");
                    } else {
                        res.send(err);
                    }
                });
            }
        });
    });

app.route("/ingredients/:ingredientName")
    .delete(verifyToken, function(req, res) {
        jwt.verify(req.token, process.env.JWT_KEY, function(err, authData) {
            if(err) {
                res.sendStatus(403);
            } else {
                Ingredient.deleteOne(
                    {
                        username: req.body.username,
                        name: req.body.ingredientName   
                    },
                    function(err) {
                        if(!err) {
                            res.send("Successfully deleted ingredient");
                        } else {
                            res.send(err);
                        }
                    }
                );
            }
        });  
    });

//------------Verify Token------------
function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    if(typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);
    }
}

app.listen(3000, function() {
    console.log("Server started on port 3000");
});