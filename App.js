import { StatusBar } from 'expo-status-bar';
import { View, ScrollView, Text, StyleSheet, TextInput, Button, Alert, Modal } from "react-native";
import * as SQLite from 'expo-sqlite';
import { useState, useEffect } from "react";
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'

export default function App() {
  const [db, setDb] = useState(SQLite.openDatabase('example.db'));
  const [isLoading, setIsLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [currentName, setCurrentName] = useState(undefined);
  const [currentAmount, setCurrentAmount] = useState(undefined);

  const [budget, setBudget] = useState(0);
  const [userBudget, setUserBudget] = useState(undefined);
  const [bill, setBill] = useState(0);
  const [leftDays, setLeftDays] = useState(0);


  const [modalVisible, setModalVisible] = useState(false);


  let today;
  let lastDay;
  let leftDaysCalculated;

  // const exportDb = async () => {
  //   if (Platform.OS === "android") {
  //     const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  //     if (permissions.granted) {
  //       const base64 = await FileSystem.readAsStringAsync(
  //         FileSystem.documentDirectory + 'SQLite/example.db',
  //         {
  //           encoding: FileSystem.EncodingType.Base64
  //         }
  //       );

  //       await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, 'example.db', 'application/octet-stream')
  //       .then(async (uri) => {
  //         await FileSystem.writeAsStringAsync(uri, base64, { encoding : FileSystem.EncodingType.Base64 });
  //       })
  //       .catch((e) => console.log(e));
  //     } else {
  //       console.log("Permission not granted");
  //     }
  //   } else {
  //     await Sharing.shareAsync(FileSystem.documentDirectory + 'SQLite/example.db');
  //   }
  // }

  // const importDb = async () => {
  //   let result = await DocumentPicker.getDocumentAsync({
  //     copyToCacheDirectory: true,
  //   });

  //   if(result.type === 'success') {
  //     setIsLoading(true);

  //     if(!(await FileSystem.getInfoAsync(FileSystem.documentDirectory + 'SQLite')).exists) {
  //       await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + 'SQLite');
  //     }

  //     const base64 = await FileSystem.readAsStringAsync(
  //       result.uri,
  //       {
  //         encoding: FileSystem.EncodingType.Base64
  //       }
  //     );

  //     await FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'SQlite/example.db', base64, { encoding: FileSystem.EncodingType.Base64})
  //     await db.closeAsync();
  //     setDb(SQLite.openDatabase('example.db'))
  //   }
  // }


  useEffect(() => {
    today = new Date();
    lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    leftDaysCalculated = lastDay.getDate() - today.getDate();
    setLeftDays(leftDaysCalculated)
    
    db.transaction(tx => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, amount REAL)')
    });

    db.transaction(tx => {
      tx.executeSql('CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, amount REAL)')
    });

    db.transaction(tx => {
      tx.executeSql('SELECT * FROM budgets ORDER BY id DESC LIMIT 1', null,
        (txObj, resultSet) => {
          if(resultSet.rows._array.length > 0) {
            setBudget(resultSet.rows._array[0].amount);
          } else {
            setBudget(0);
          }
        }
      )
    });

    db.transaction(tx => {
      tx.executeSql('SELECT * FROM expenses', null,
        (txObj, resultSet) => {
          setExpenses(resultSet.rows._array);
          setBill(resultSet.rows._array.reduce((acc, expense) => acc + expense.amount ,0));
        },
        (txObj, error) => console.log(error) 
      );
    });
    setIsLoading(false);
  }, [db]);
  
  if(isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const setNewUserBudget = () => {
    db.transaction(tx => {
      tx.executeSql('INSERT INTO budgets (amount) VALUES (?)', [userBudget],
        (txObj, resultSet) => {
          setBudget(userBudget);
          setModalVisible(false);
        },
        (txObj, error) => console.log(error)
      );
    });
  }

  const addExpense = () => {
    db.transaction(tx => {
      tx.executeSql('INSERT INTO expenses (name, amount) VALUES (?, ?)', [currentName ? currentName : 'blabla', currentAmount ? currentAmount : 1],
        (txObj, resultSet) => {
          let existingExpenses = [...expenses];
          existingExpenses.push({ id: resultSet.insertId, name: currentName ? currentName : 'blabla', amount: currentAmount ? currentAmount : 1});
          setExpenses(existingExpenses);
          setBill(bill + parseFloat(currentAmount ? currentAmount : 1));
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          Alert.alert('Modal has been closed.');
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TextInput style={styles.textInput} value={userBudget} placeholder="Set your personal budget" keyboardType="numeric" onChangeText={setUserBudget} />
            <View style={{flexDirection: 'row'}}>
              <Button title="save" onPress={setNewUserBudget} color="blue"/>
              <View style={{width:20}}></View>
              <Button title="cancel" onPress={() => setModalVisible(!modalVisible)} color="red"/>
            </View>
          </View>
        </View>
      </Modal>

      <View>
        <Text>Budget: S/. {budget}</Text>
        <Button title="S" onPress={() => setModalVisible(true)} color="#841584"/>
      </View>
      <View style={styles.resume}>
        <Text style={{marginRight: 10}}>Bill: S/. {bill}</Text>
        <Text style={{marginRight: 10}}>Day: S/. {((budget - bill) / leftDays).toFixed(2)}</Text>
        <Text style={{marginRight: 10}}>Left Days: {leftDays}</Text>
      </View>
      <TextInput style={styles.textInput} value={currentName} placeholder="Expense name" onChangeText={setCurrentName} />
      <TextInput style={styles.textInput} value={currentAmount} placeholder="Amount" keyboardType="numeric" onChangeText={setCurrentAmount} />
      <Button title="Add Expense" onPress={addExpense} color="green"/>
      {/* <Button title="Export" onPress={exportDb} color="green"/>
      <Button title="Import" onPress={importDb} color="green"/> */}
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
    paddingTop: 80,
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
    justifyContent: 'center',
    margin: 9,
    padding: 10,
  },
  buttonsModal: {
    flexDirection: 'row',
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
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  buttonOpen: {
    backgroundColor: '#F194FF',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
})