import { StatusBar } from 'expo-status-bar';
import { View, ScrollView, Text, StyleSheet, TextInput, Button, Alert } from "react-native";
import * as SQLite from 'expo-sqlite';
import { useState, useEffect } from "react";

export default function App() {
  const db = SQLite.openDatabase('example.db');
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [currentName, setCurrentName] = useState(undefined);
  const [currentAmount, setCurrentAmount] = useState(undefined);

  const [budget, setBudget] = useState(0);
  const [bill, setBill] = useState(0);
  const [budgetPerDay, setBudgetPerDay] = useState(0);
  const [leftDays, setLeftDays] = useState(0);

  let today;
  let lastDay;
  let leftDaysCalculated;
  const BUDGET = 0;


  useEffect(() => {
    today = new Date();
    lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    leftDaysCalculated = lastDay.getDate() - today.getDate();
    setLeftDays(leftDaysCalculated)
    
    db.transaction(tx => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, amount REAL)')
    });

    db.transaction(tx => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS budget (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL)')
    });

    db.transaction(tx => {
      tx.executeSql('SELECT * FROM expenses', null,
        (txObj, resultSet) => {
          setExpenses(resultSet.rows._array);
          setBill(resultSet.rows._array.reduce((acc, expense) => acc + expense.amount ,0));
          calculateBill(resultSet.rows._array.reduce((acc, expense) => acc + expense.amount ,0))
        },
        (txObj, error) => console.log(error) 
      );
    });

    setBudget(BUDGET);
    setIsLoading(false);
  }, []);
  
  if(isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const setUserBudget = () => {
    Alert.prompt(
      "Enter password"
    );
  }

  const calculateBill = (bill) => {
    const remaining = BUDGET - bill;
    const totalBudgetPerDay = remaining / leftDaysCalculated;
    setBudgetPerDay(totalBudgetPerDay.toFixed(2))
  }

  const addExpense = () => {
    db.transaction(tx => {
      tx.executeSql('INSERT INTO expenses (name, amount) VALUES (?, ?)', [currentName ? currentName : 'blabla', currentAmount ? currentAmount : 0],
        (txObj, resultSet) => {
          let existingExpenses = [...expenses];
          existingExpenses.push({ id: resultSet.insertId, name: currentName ? currentName : 'blabla', amount: currentAmount ? currentAmount : 0});
          setExpenses(existingExpenses);
          setBill(bill + parseFloat(currentAmount ? currentAmount : 0));
          calculateBill(bill + parseFloat(currentAmount ? currentAmount : 0))
          setCurrentName(undefined);
          setCurrentAmount(undefined);
        },
        (txObj, error) => console.log(error)
      );
    });
  }

  const deleteExpense = (id) => {
    db.transaction(tx => {
      tx.executeSql('DELETE FROM expenses WHERE id = ?', [id],
        (txObj, resultSet) => {
          if(resultSet.rowsAffected > 0) {
            let existingExpenses = [...expenses].filter(expense => expense.id !== id);
            let deletedExpense = [...expenses].find(expense => expense.id === id);
            setExpenses(existingExpenses);
            setBill(bill - parseFloat(deletedExpense.amount));
            calculateBill(bill - parseFloat(deletedExpense.amount))
          }
        },
        (txObj, error) => console.log(error)
      );
    });
  };


  // FOR IMPLEMENTING AFTER
  const updateName = (id) => {
    db.transaction(tx => {
      tx.executeSql('UPDATE names SET name = ? WHERE id = ?', [currentName, id],
        (txObj, resultSet) => {
          if(resultSet.rowsAffected > 0) {
            let existingNames = [...names];
            const indexToUpdate = existingNames.findIndex(name => name.id === id);
            existingNames[indexToUpdate].name = currentName;
            setNames(existingNames);
            setCurrentName(undefined);
          }
        },
        (txObj, error) => console.log(error)
      );
    });
  };

  const showExpenses = () => {
    return expenses.map((expense, index) => {
      return (
        <View key={index} style={styles.row}>
          <Text>{expense.name}</Text>
          <Text>S/. {expense.amount}</Text>
          <Button title="del" onPress={() => deleteExpense(expense.id)} color={'red'}/>
          {/* <Button title="update" onPress={() => updateName(expense.id)}/> */}
        </View>
      );
    });
  };


  return (
    <View style={styles.container}>
      <View style={styles.resume}>
        <Text>Budget: S/. {budget}/{bill}</Text>
        <Text>Left Days: {leftDays}</Text>
        <Text>Budget per day: S/. {budgetPerDay}</Text>
        <Button title="S" onPress={setUserBudget} color="#841584"/>

      </View>
      <TextInput style={styles.textInput} value={currentName} placeholder="expense name" onChangeText={setCurrentName} />
      <TextInput style={styles.textInput} value={currentAmount} placeholder="amount" keyboardType="numeric" onChangeText={setCurrentAmount} />
      <Button title="Add Expense" onPress={addExpense} color="green"/>

      {/* <FlatList
        style={styles.flatList}
        data={expenses}
        keyExtractor={(expense) => expense.id}
        renderItem={({expense}) => {console.log(expense);return(<Text>HOla</Text>)}}
      /> */}
      <ScrollView style={styles.scrollView}>
        {showExpenses()}
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
    paddingBottom: 100,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: 30,
    paddingHorizontal: 16,
  },
  resume: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: 9,
    padding: 10,
  },
  row: {
    width: '85%',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  textInput: {
    width: 200,
    height: 40,
    borderWidth: 1, // Establece el ancho del borde
    borderColor: 'gray', // Establece el color del borde
    borderRadius: 5, // Establece la curvatura de los bordes (opcional)
    paddingLeft: 10, // Espacio a la izquierda del texto dentro del input (opcional)
    marginBottom: 10
  },
})