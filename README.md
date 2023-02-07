# SQL#-based System for Maintainable Database Queries

![System Interface of the SQL#-based system](docs/interface.jpgs)


The system aims to improve the maintainability of complex database queries. To achieve the goal, we design a new query language called SQL# and develop the system in this repository.
The system has two features:
- **Query visualization**: The system visualizes a SQL# program to help developers understand complex queries. 
- **Query debugging**: The system compiles a SQL# program into multiple SQL programs that retrieve the intermediate tables involved in the process of constructing the SQL# program to help developers debug complex queries.

## Run system
1. Download the code in the `src` directory
2. Enter the `src` directory
3. Download Node.js, and run the `npm install ` command below to install the needed packages
4. Run the `yarn start` and open the browser and enter http://localhost:3000/

## Build system
1. Download the code in the `src` directory
2. Enter the `src` directory
3. Run the `yarn build` command

Thus, the content in the `build` directory is an executable version of the system.

An executable version built by us is deployed at https://querydebugger.github.io/.

## Instruction Manual
User Instruction for the SQL# Language and the SQL#-based System is available at https://github.com/QueryDebugger/QuerySystem/blob/main/docs/1_InstructionManual.pdf.

## Demo
An demo video for the system is available at \url{https://github.com/QueryDebugger/QuerySystem/releases/download/1.0/ExplanatoryVideo.mp4}.