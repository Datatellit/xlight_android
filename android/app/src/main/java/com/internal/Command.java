package com.internal;

import com.amap.api.location.AMapLocation;
import com.amap.api.location.AMapLocationClient;
import com.amap.api.location.AMapLocationClientOption;
import com.amap.api.location.AMapLocationClientOption.AMapLocationMode;
import com.amap.api.location.AMapLocationClientOption.AMapLocationProtocol;
import com.amap.api.location.AMapLocationListener;

import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * Created by 75932 on 2017/4/25.
 */
public class Command extends ReactContextBaseJavaModule {
    private AMapLocationClient locationClient = null;
    private final String TAG = "Command";

    //构造函数
    public Command(ReactApplicationContext reactContext) {
        super(reactContext);
        locationClient = new AMapLocationClient(reactContext.getApplicationContext());
        //设置定位参数
        locationClient.setLocationOption(getDefaultOption());
        // 设置定位监听
        locationClient.setLocationListener(locationListener);
    }

    @Override
    public String getName() {
        return "Command";
    }

    @ReactMethod
    public void getApiLevel(Callback callback) {
        boolean isSupport = false;
        Log.i(TAG, "Level->" + Build.VERSION.SDK_INT + "->" + Build.VERSION_CODES.KITKAT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT)
            isSupport = true;
        callback.invoke(isSupport);
    }

    Callback locationCallback = null;
    Callback errorCallback = null;

    @ReactMethod
    public void GetLocation(Callback callback, Callback error) {
        locationCallback = callback;
        errorCallback = error;
        //先停止
        if (locationClient.isStarted())
            locationClient.stopLocation();
        AMapLocation location = locationClient.getLastKnownLocation();
        if (location != null) {
            Log.i(TAG, "getLastKnownLocation success");
            locationCallback.invoke(true, location.getLongitude(), location.getLatitude());
        }
        //开始定位
        Log.i(TAG, "start Location");
        locationClient.startLocation();
    }

    /**
     * 默认的定位参数
     *
     * @author hongming.wang
     * @since 2.8.0
     */
    private AMapLocationClientOption getDefaultOption() {
        AMapLocationClientOption mOption = new AMapLocationClientOption();
        mOption.setMockEnable(true);
        mOption.setLocationMode(AMapLocationMode.Hight_Accuracy);//可选，设置定位模式，可选的模式有高精度、仅设备、仅网络。默认为高精度模式
        mOption.setGpsFirst(true);//可选，设置是否gps优先，只在高精度模式下有效。默认关闭
        mOption.setHttpTimeOut(30000);//可选，设置网络请求超时时间。默认为30秒。在仅设备模式下无效
        mOption.setInterval(2000);//可选，设置定位间隔。默认为2秒
        mOption.setNeedAddress(true);//可选，设置是否返回逆地理地址信息。默认是true
        mOption.setOnceLocation(true);//可选，设置是否单次定位。默认是false
        mOption.setOnceLocationLatest(false);//可选，设置是否等待wifi刷新，默认为false.如果设置为true,会自动变为单次定位，持续定位时不要使用
        AMapLocationClientOption.setLocationProtocol(AMapLocationProtocol.HTTP);//可选， 设置网络请求的协议。可选HTTP或者HTTPS。默认为HTTP
        mOption.setSensorEnable(false);//可选，设置是否使用传感器。默认是false
        mOption.setWifiScan(true); //可选，设置是否开启wifi扫描。默认为true，如果设置为false会同时停止主动刷新，停止以后完全依赖于系统刷新，定位位置可能存在误差
        mOption.setLocationCacheEnable(true); //可选，设置是否使用缓存定位，默认为true
        return mOption;
    }

    /**
     * 定位监听
     */
    AMapLocationListener locationListener = new AMapLocationListener() {
        @Override
        public void onLocationChanged(AMapLocation loc) {
            if (null != loc && loc.getErrorCode() == 0) {
                Log.i(TAG, "get position " + loc.getLongitude() + "," + loc.getLatitude());
                //解析定位结果
                locationCallback.invoke(true, loc.getLongitude(), loc.getLatitude());
            } else {
                Log.e(TAG, "location Error, ErrCode:"
                        + loc.getErrorCode() + ", errInfo:"
                        + loc.getErrorInfo());
                errorCallback.invoke(false, loc.getErrorCode(), loc.getErrorInfo());
            }
        }
    };
}
