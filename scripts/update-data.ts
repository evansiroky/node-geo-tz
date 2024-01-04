import update from '../src/update'

update((err) => {
  if (err) {
    console.log('update unsuccessful.  Error: ', err)
  } else {
    console.log('update successfully completed')
  }
})
