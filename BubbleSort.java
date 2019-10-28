public class BubbleSort{
    public static void sort(int[] array){
        //n-1趟比较
        for(int i = 1;i < array.length; i++){
            for(int j = 0;j < array.length - i -1;j++){
                int temp = array[j];
                 array[j] = array[j+1];
                 array[j+1] = temp;
            }
        }
    }

}