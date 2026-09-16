const express = require("express");
const {getMetrics} = require("../metrices/metrices")
const Router = express.Router();

 const showMetrices = async(req,res)=>{
    const metrics = await getMetrics()
   return  res.status(200).json({
        message:"Successfully retrived the  metrices",
        metrics
    })
}


Router.get("/",showMetrices);
module.exports = Router;